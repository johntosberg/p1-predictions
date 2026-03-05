package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/johnosberg/p1predictions/middleware"
	"github.com/johnosberg/p1predictions/models"
)

type PredictionHandler struct {
	pool *pgxpool.Pool
}

func NewPredictionHandler(pool *pgxpool.Pool) *PredictionHandler {
	return &PredictionHandler{pool: pool}
}

func (h *PredictionHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	raceID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	// Check lock time
	var lockTime time.Time
	var isCancelled bool
	err := h.pool.QueryRow(r.Context(),
		"SELECT lock_time, is_cancelled FROM race_weekends WHERE id = $1", raceID,
	).Scan(&lockTime, &isCancelled)
	if err != nil {
		WriteError(w, http.StatusNotFound, "race weekend not found")
		return
	}

	if isCancelled {
		WriteError(w, http.StatusForbidden, "race weekend is cancelled")
		return
	}

	if time.Now().After(lockTime) {
		WriteError(w, http.StatusForbidden, "predictions are locked")
		return
	}

	var req models.PredictionsRequest
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
	var predictions []models.PredictionResponse

	for _, p := range req.Predictions {
		if p.Value == "" {
			continue
		}

		var updatedAt time.Time
		err := tx.QueryRow(r.Context(),
			`INSERT INTO predictions (user_id, race_weekend_id, category_id, value, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $5)
			 ON CONFLICT (user_id, race_weekend_id, category_id)
			 DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
			 RETURNING updated_at`,
			userID, raceID, p.CategoryID, p.Value, now,
		).Scan(&updatedAt)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "failed to save prediction")
			return
		}

		predictions = append(predictions, models.PredictionResponse{
			CategoryID: p.CategoryID,
			Value:      p.Value,
			UpdatedAt:  updatedAt.Unix(),
		})
	}

	if err := tx.Commit(r.Context()); err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to commit")
		return
	}

	if predictions == nil {
		predictions = []models.PredictionResponse{}
	}

	WriteJSON(w, http.StatusOK, predictions)
}
