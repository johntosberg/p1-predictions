package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/johnosberg/p1predictions/models"
)

type AdminHandler struct {
	pool *pgxpool.Pool
}

func NewAdminHandler(pool *pgxpool.Pool) *AdminHandler {
	return &AdminHandler{pool: pool}
}

// Categories

func (h *AdminHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, name, description, points, display_order, is_sprint_only, is_active, created_at
		 FROM prediction_categories ORDER BY display_order`)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query categories")
		return
	}
	defer rows.Close()

	var categories []models.PredictionCategory
	for rows.Next() {
		var c models.PredictionCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Points, &c.DisplayOrder, &c.IsSprintOnly, &c.IsActive, &c.CreatedAt); err != nil {
			continue
		}
		categories = append(categories, c)
	}
	if categories == nil {
		categories = []models.PredictionCategory{}
	}

	WriteJSON(w, http.StatusOK, categories)
}

func (h *AdminHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req models.CategoryRequest
	if err := DecodeJSON(r, &req); err != nil || req.Name == "" {
		WriteError(w, http.StatusBadRequest, "name is required")
		return
	}

	var cat models.PredictionCategory
	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO prediction_categories (name, description, points, display_order, is_sprint_only)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, name, description, points, display_order, is_sprint_only, is_active, created_at`,
		req.Name, req.Description, req.Points, req.DisplayOrder, req.IsSprintOnly,
	).Scan(&cat.ID, &cat.Name, &cat.Description, &cat.Points, &cat.DisplayOrder, &cat.IsSprintOnly, &cat.IsActive, &cat.CreatedAt)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to create category")
		return
	}

	WriteJSON(w, http.StatusCreated, cat)
}

func (h *AdminHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	catID := chi.URLParam(r, "id")

	var req struct {
		Name         *string `json:"name"`
		Description  *string `json:"description"`
		Points       *int    `json:"points"`
		DisplayOrder *int    `json:"display_order"`
		IsSprintOnly *bool   `json:"is_sprint_only"`
		IsActive     *bool   `json:"is_active"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var cat models.PredictionCategory
	err := h.pool.QueryRow(r.Context(),
		`UPDATE prediction_categories SET
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			points = COALESCE($4, points),
			display_order = COALESCE($5, display_order),
			is_sprint_only = COALESCE($6, is_sprint_only),
			is_active = COALESCE($7, is_active)
		 WHERE id = $1
		 RETURNING id, name, description, points, display_order, is_sprint_only, is_active, created_at`,
		catID, req.Name, req.Description, req.Points, req.DisplayOrder, req.IsSprintOnly, req.IsActive,
	).Scan(&cat.ID, &cat.Name, &cat.Description, &cat.Points, &cat.DisplayOrder, &cat.IsSprintOnly, &cat.IsActive, &cat.CreatedAt)
	if err != nil {
		WriteError(w, http.StatusNotFound, "category not found")
		return
	}

	WriteJSON(w, http.StatusOK, cat)
}

func (h *AdminHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	catID := chi.URLParam(r, "id")

	_, err := h.pool.Exec(r.Context(),
		"UPDATE prediction_categories SET is_active = false WHERE id = $1", catID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to deactivate category")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Race Weekends

func (h *AdminHandler) ListRaceWeekends(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, season, round, name, short_name, circuit, country,
		        race_date, lock_time, is_sprint, is_cancelled, created_at, updated_at
		 FROM race_weekends ORDER BY round`)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query race weekends")
		return
	}
	defer rows.Close()

	var weekends []models.RaceWeekend
	for rows.Next() {
		var rw models.RaceWeekend
		if err := rows.Scan(&rw.ID, &rw.Season, &rw.Round, &rw.Name, &rw.ShortName, &rw.Circuit, &rw.Country,
			&rw.RaceDate, &rw.LockTime, &rw.IsSprint, &rw.IsCancelled, &rw.CreatedAt, &rw.UpdatedAt); err != nil {
			continue
		}
		weekends = append(weekends, rw)
	}
	if weekends == nil {
		weekends = []models.RaceWeekend{}
	}

	WriteJSON(w, http.StatusOK, weekends)
}

func (h *AdminHandler) PatchRaceWeekend(w http.ResponseWriter, r *http.Request) {
	raceID := chi.URLParam(r, "id")

	var req models.PatchRaceWeekendRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var raceDate, lockTime *time.Time
	if req.RaceDate != nil {
		t := time.Unix(*req.RaceDate, 0)
		raceDate = &t
	}
	if req.LockTime != nil {
		t := time.Unix(*req.LockTime, 0)
		lockTime = &t
	}

	var rw models.RaceWeekend
	err := h.pool.QueryRow(r.Context(),
		`UPDATE race_weekends SET
			race_date = COALESCE($2, race_date),
			lock_time = COALESCE($3, lock_time),
			is_cancelled = COALESCE($4, is_cancelled),
			updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, season, round, name, short_name, circuit, country,
		           race_date, lock_time, is_sprint, is_cancelled, created_at, updated_at`,
		raceID, raceDate, lockTime, req.IsCancelled,
	).Scan(&rw.ID, &rw.Season, &rw.Round, &rw.Name, &rw.ShortName, &rw.Circuit, &rw.Country,
		&rw.RaceDate, &rw.LockTime, &rw.IsSprint, &rw.IsCancelled, &rw.CreatedAt, &rw.UpdatedAt)
	if err != nil {
		WriteError(w, http.StatusNotFound, "race weekend not found")
		return
	}

	WriteJSON(w, http.StatusOK, rw)
}

// Scoring

func (h *AdminHandler) GetScores(w http.ResponseWriter, r *http.Request) {
	raceID := chi.URLParam(r, "id")

	rows, err := h.pool.Query(r.Context(),
		`SELECT u.id, u.display_name,
		        pc.id AS cat_id,
		        COALESCE(p.value, '') AS pred_value,
		        s.points,
		        s.note
		 FROM predictions p
		 JOIN users u ON u.id = p.user_id
		 JOIN prediction_categories pc ON pc.id = p.category_id AND pc.is_active = true
		 LEFT JOIN scores s ON s.user_id = p.user_id AND s.race_weekend_id = p.race_weekend_id AND s.category_id = p.category_id
		 WHERE p.race_weekend_id = $1
		 ORDER BY u.display_name, pc.display_order`,
		raceID,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query scores")
		return
	}
	defer rows.Close()

	entryMap := make(map[string]*models.AdminScoreEntry)
	var orderKeys []string

	for rows.Next() {
		var userIDVal, displayName, catID, value string
		var points *int
		var note *string
		if err := rows.Scan(&userIDVal, &displayName, &catID, &value, &points, &note); err != nil {
			continue
		}

		entry, ok := entryMap[userIDVal]
		if !ok {
			entry = &models.AdminScoreEntry{
				UserID:      userIDVal,
				DisplayName: displayName,
			}
			entryMap[userIDVal] = entry
			orderKeys = append(orderKeys, userIDVal)
		}

		entry.Predictions = append(entry.Predictions, models.AdminPredictionWithScore{
			CategoryID: catID,
			Value:      value,
			Points:     points,
			Note:       note,
		})
	}

	var entries []models.AdminScoreEntry
	for _, uid := range orderKeys {
		entries = append(entries, *entryMap[uid])
	}
	if entries == nil {
		entries = []models.AdminScoreEntry{}
	}

	WriteJSON(w, http.StatusOK, entries)
}

func (h *AdminHandler) UpsertScores(w http.ResponseWriter, r *http.Request) {
	raceID := chi.URLParam(r, "id")

	var req models.ScoresRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback(r.Context())

	now := time.Now()
	for _, s := range req.Scores {
		_, err := tx.Exec(r.Context(),
			`INSERT INTO scores (user_id, race_weekend_id, category_id, points, note, awarded_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $6)
			 ON CONFLICT (user_id, race_weekend_id, category_id)
			 DO UPDATE SET points = EXCLUDED.points, note = EXCLUDED.note, updated_at = EXCLUDED.updated_at`,
			s.UserID, raceID, s.CategoryID, s.Points, s.Note, now,
		)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "failed to upsert score")
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to commit")
		return
	}

	// Return updated scores
	h.GetScores(w, r)
}
