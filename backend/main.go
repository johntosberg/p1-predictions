package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/johnosberg/p1predictions/config"
	"github.com/johnosberg/p1predictions/db"
	"github.com/johnosberg/p1predictions/handlers"
	"github.com/johnosberg/p1predictions/middleware"
)

func main() {
	godotenv.Load()

	// Handle CLI commands
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "set-admin":
			if len(os.Args) < 3 {
				log.Fatal("Usage: p1predictions set-admin <user-uuid>")
			}
			setAdmin(os.Args[2])
			return
		}
	}

	ctx := context.Background()

	databaseURL := getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/p1predictions")
	port := getEnv("PORT", "8080")
	jwtSecret := getEnv("SUPABASE_JWT_SECRET", "")
	seasonPath := getEnv("SEASON_CONFIG_PATH", "./config/seasons/2026.yaml")
	corsOrigin := getEnv("CORS_ORIGIN", "http://localhost:3000")
	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNS", "10"))

	supabaseURL := getEnv("SUPABASE_URL", getEnv("NEXT_PUBLIC_SUPABASE_URL", ""))

	if jwtSecret == "" && supabaseURL == "" {
		log.Fatal("SUPABASE_JWT_SECRET or SUPABASE_URL is required")
	}

	// Initialize JWKS key set for ECC token verification
	var jwks *middleware.JWKSKeySet
	if supabaseURL != "" {
		jwks = middleware.NewJWKSKeySet(supabaseURL)
		log.Printf("JWKS verification enabled from %s", supabaseURL)
	}

	// Database
	pool, err := db.NewPool(ctx, databaseURL, maxConns)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Run migrations
	if err := db.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Seed race weekends from YAML
	seasonCfg, err := config.LoadSeasonConfig(seasonPath)
	if err != nil {
		log.Printf("Warning: could not load season config: %v", err)
	} else {
		if err := seedRaceWeekends(ctx, pool, seasonCfg); err != nil {
			log.Fatalf("Failed to seed race weekends: %v", err)
		}
	}

	// Handlers
	authH := handlers.NewAuthHandler(pool)
	raceH := handlers.NewRaceWeekendHandler(pool)
	predH := handlers.NewPredictionHandler(pool)
	leagueH := handlers.NewLeagueHandler(pool)
	adminH := handlers.NewAdminHandler(pool)

	// Router
	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		handlers.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Auth-required routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(jwtSecret, jwks))

			r.Post("/auth/me", authH.Me)

			r.Get("/race-weekends", raceH.List)
			r.Get("/race-weekends/{id}", raceH.Get)

			r.Put("/race-weekends/{id}/predictions", predH.Upsert)

			r.Post("/leagues", leagueH.Create)
			r.Post("/leagues/join", leagueH.Join)
			r.Get("/leagues", leagueH.List)
			r.Get("/leagues/{id}", leagueH.Get)
			r.Get("/leagues/{id}/race-weekends/{raceId}", leagueH.GetRaceWeekend)
			r.Delete("/leagues/{id}/leave", leagueH.Leave)

			// Admin routes
			r.Route("/admin", func(r chi.Router) {
				r.Use(middleware.AdminMiddleware(pool))

				r.Get("/categories", adminH.ListCategories)
				r.Post("/categories", adminH.CreateCategory)
				r.Patch("/categories/{id}", adminH.UpdateCategory)
				r.Delete("/categories/{id}", adminH.DeleteCategory)

				r.Get("/race-weekends", adminH.ListRaceWeekends)
				r.Patch("/race-weekends/{id}", adminH.PatchRaceWeekend)

				r.Get("/race-weekends/{id}/scores", adminH.GetScores)
				r.Put("/race-weekends/{id}/scores", adminH.UpsertScores)
			})
		})
	})

	log.Printf("Starting P1 Predictions API on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

func setAdmin(userID string) {
	ctx := context.Background()
	godotenv.Load()

	databaseURL := getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/p1predictions")
	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNS", "10"))

	pool, err := db.NewPool(ctx, databaseURL, maxConns)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	tag, err := pool.Exec(ctx,
		"UPDATE users SET is_admin = true WHERE id = $1", userID)
	if err != nil {
		log.Fatalf("Failed to set admin: %v", err)
	}
	if tag.RowsAffected() == 0 {
		log.Fatal("User not found. Register first via the UI, then run this command.")
	}
	fmt.Printf("User %s is now an admin\n", userID)
}

func seedRaceWeekends(ctx context.Context, pool *pgxpool.Pool, cfg *config.SeasonConfig) error {
	for _, race := range cfg.Races {
		raceDate, err := race.ParseRaceDate()
		if err != nil {
			return fmt.Errorf("parse race date for round %d: %w", race.Round, err)
		}
		lockTime, err := race.ParseLockTime()
		if err != nil {
			return fmt.Errorf("parse lock time for round %d: %w", race.Round, err)
		}

		_, err = pool.Exec(ctx,
			`INSERT INTO race_weekends (season, round, name, short_name, circuit, country, race_date, lock_time, is_sprint)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 ON CONFLICT (season, round) DO UPDATE SET
			   name = EXCLUDED.name,
			   short_name = EXCLUDED.short_name,
			   circuit = EXCLUDED.circuit,
			   country = EXCLUDED.country,
			   is_sprint = EXCLUDED.is_sprint`,
			cfg.Season, race.Round, race.Name, race.ShortName, race.Circuit, race.Country,
			raceDate, lockTime, race.IsSprint,
		)
		if err != nil {
			return fmt.Errorf("upsert round %d: %w", race.Round, err)
		}
	}
	log.Printf("Seeded %d race weekends for %d season", len(cfg.Races), cfg.Season)
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
