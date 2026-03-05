package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/johnosberg/p1predictions/middleware"
	"github.com/johnosberg/p1predictions/models"
)

type RaceWeekendHandler struct {
	pool *pgxpool.Pool
}

func NewRaceWeekendHandler(pool *pgxpool.Pool) *RaceWeekendHandler {
	return &RaceWeekendHandler{pool: pool}
}

func (h *RaceWeekendHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	now := time.Now()

	rows, err := h.pool.Query(r.Context(),
		`SELECT rw.id, rw.season, rw.round, rw.name, rw.short_name, rw.circuit, rw.country,
		        rw.race_date, rw.lock_time, rw.is_sprint, rw.is_cancelled,
		        EXISTS(SELECT 1 FROM predictions p WHERE p.race_weekend_id = rw.id AND p.user_id = $1) AS has_predictions,
		        EXISTS(SELECT 1 FROM scores s WHERE s.race_weekend_id = rw.id) AS has_scores
		 FROM race_weekends rw
		 WHERE rw.is_cancelled = false
		 ORDER BY rw.round`,
		userID,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query race weekends")
		return
	}
	defer rows.Close()

	var weekends []models.RaceWeekend
	for rows.Next() {
		var rw models.RaceWeekend
		var hasPredictions, hasScores bool
		if err := rows.Scan(
			&rw.ID, &rw.Season, &rw.Round, &rw.Name, &rw.ShortName, &rw.Circuit, &rw.Country,
			&rw.RaceDate, &rw.LockTime, &rw.IsSprint, &rw.IsCancelled,
			&hasPredictions, &hasScores,
		); err != nil {
			WriteError(w, http.StatusInternalServerError, "failed to scan race weekend")
			return
		}

		rw.Status = computeStatus(rw.LockTime, now, hasPredictions, hasScores)
		weekends = append(weekends, rw)
	}

	if weekends == nil {
		weekends = []models.RaceWeekend{}
	}

	WriteJSON(w, http.StatusOK, weekends)
}

func (h *RaceWeekendHandler) Get(w http.ResponseWriter, r *http.Request) {
	raceID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	var rw models.RaceWeekend
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, season, round, name, short_name, circuit, country,
		        race_date, lock_time, is_sprint, is_cancelled, created_at, updated_at
		 FROM race_weekends WHERE id = $1`, raceID,
	).Scan(&rw.ID, &rw.Season, &rw.Round, &rw.Name, &rw.ShortName, &rw.Circuit, &rw.Country,
		&rw.RaceDate, &rw.LockTime, &rw.IsSprint, &rw.IsCancelled, &rw.CreatedAt, &rw.UpdatedAt)
	if err != nil {
		WriteError(w, http.StatusNotFound, "race weekend not found")
		return
	}

	// Categories
	catRows, err := h.pool.Query(r.Context(),
		`SELECT id, name, description, points, display_order, is_sprint_only
		 FROM prediction_categories WHERE is_active = true ORDER BY display_order`)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query categories")
		return
	}
	defer catRows.Close()

	var categories []models.PredictionCategory
	for catRows.Next() {
		var c models.PredictionCategory
		if err := catRows.Scan(&c.ID, &c.Name, &c.Description, &c.Points, &c.DisplayOrder, &c.IsSprintOnly); err != nil {
			continue
		}
		c.IsActive = true
		categories = append(categories, c)
	}
	if categories == nil {
		categories = []models.PredictionCategory{}
	}

	// User predictions
	predRows, err := h.pool.Query(r.Context(),
		`SELECT category_id, value, updated_at FROM predictions
		 WHERE user_id = $1 AND race_weekend_id = $2`, userID, raceID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query predictions")
		return
	}
	defer predRows.Close()

	var predictions []models.PredictionResponse
	for predRows.Next() {
		var p models.PredictionResponse
		var updatedAt time.Time
		if err := predRows.Scan(&p.CategoryID, &p.Value, &updatedAt); err != nil {
			continue
		}
		p.UpdatedAt = updatedAt.Unix()
		predictions = append(predictions, p)
	}
	if predictions == nil {
		predictions = []models.PredictionResponse{}
	}

	// User scores
	scoreRows, err := h.pool.Query(r.Context(),
		`SELECT category_id, points, note FROM scores
		 WHERE user_id = $1 AND race_weekend_id = $2`, userID, raceID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query scores")
		return
	}
	defer scoreRows.Close()

	var scores []models.ScoreResponse
	for scoreRows.Next() {
		var s models.ScoreResponse
		if err := scoreRows.Scan(&s.CategoryID, &s.Points, &s.Note); err != nil {
			continue
		}
		scores = append(scores, s)
	}
	if scores == nil {
		scores = []models.ScoreResponse{}
	}

	WriteJSON(w, http.StatusOK, models.RaceWeekendDetail{
		RaceWeekend: rw,
		Categories:  categories,
		Predictions: predictions,
		Scores:      scores,
	})
}

func computeStatus(lockTime, now time.Time, hasPredictions, hasScores bool) string {
	if hasScores {
		return "scored"
	}
	if now.After(lockTime) {
		return "locked"
	}
	if hasPredictions {
		return "open"
	}
	return "upcoming"
}
