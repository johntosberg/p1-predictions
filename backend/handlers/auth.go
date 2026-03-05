package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/johnosberg/p1predictions/middleware"
	"github.com/johnosberg/p1predictions/models"
)

type AuthHandler struct {
	pool *pgxpool.Pool
}

func NewAuthHandler(pool *pgxpool.Pool) *AuthHandler {
	return &AuthHandler{pool: pool}
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	email := middleware.GetEmail(r.Context())

	var req models.AuthMeRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.DisplayName == "" {
		req.DisplayName = email
	}

	var user models.User
	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO users (id, email, display_name)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
		 RETURNING id, email, display_name, is_admin, created_at`,
		userID, email, req.DisplayName,
	).Scan(&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.CreatedAt)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to upsert user")
		return
	}

	WriteJSON(w, http.StatusOK, user)
}
