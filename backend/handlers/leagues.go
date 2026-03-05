package handlers

import (
	"context"
	"crypto/rand"
	"math/big"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/johnosberg/p1predictions/middleware"
	"github.com/johnosberg/p1predictions/models"
)

type LeagueHandler struct {
	pool *pgxpool.Pool
}

func NewLeagueHandler(pool *pgxpool.Pool) *LeagueHandler {
	return &LeagueHandler{pool: pool}
}

func (h *LeagueHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req models.CreateLeagueRequest
	if err := DecodeJSON(r, &req); err != nil || req.Name == "" {
		WriteError(w, http.StatusBadRequest, "name is required")
		return
	}

	joinCode, err := generateJoinCode(r.Context(), h.pool)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to generate join code")
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback(r.Context())

	var league models.League
	err = tx.QueryRow(r.Context(),
		`INSERT INTO leagues (name, owner_id, join_code)
		 VALUES ($1, $2, $3)
		 RETURNING id, name, owner_id, join_code, created_at`,
		req.Name, userID, joinCode,
	).Scan(&league.ID, &league.Name, &league.OwnerID, &league.JoinCode, &league.CreatedAt)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to create league")
		return
	}

	_, err = tx.Exec(r.Context(),
		`INSERT INTO league_memberships (league_id, user_id) VALUES ($1, $2)`,
		league.ID, userID,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to add owner as member")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to commit")
		return
	}

	league.MemberCount = 1
	WriteJSON(w, http.StatusCreated, league)
}

func (h *LeagueHandler) Join(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req models.JoinLeagueRequest
	if err := DecodeJSON(r, &req); err != nil || req.JoinCode == "" {
		WriteError(w, http.StatusBadRequest, "join_code is required")
		return
	}

	var league models.League
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, name, owner_id, join_code, created_at
		 FROM leagues WHERE join_code = $1`, req.JoinCode,
	).Scan(&league.ID, &league.Name, &league.OwnerID, &league.JoinCode, &league.CreatedAt)
	if err != nil {
		WriteError(w, http.StatusNotFound, "league not found")
		return
	}

	_, err = h.pool.Exec(r.Context(),
		`INSERT INTO league_memberships (league_id, user_id) VALUES ($1, $2)`,
		league.ID, userID,
	)
	if err != nil {
		WriteError(w, http.StatusConflict, "already a member")
		return
	}

	WriteJSON(w, http.StatusOK, league)
}

func (h *LeagueHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	rows, err := h.pool.Query(r.Context(),
		`SELECT l.id, l.name, l.owner_id, l.join_code, l.created_at,
		        (SELECT COUNT(*) FROM league_memberships lm2 WHERE lm2.league_id = l.id) AS member_count
		 FROM leagues l
		 JOIN league_memberships lm ON lm.league_id = l.id
		 WHERE lm.user_id = $1
		 ORDER BY l.created_at DESC`, userID,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query leagues")
		return
	}
	defer rows.Close()

	var leagues []models.League
	for rows.Next() {
		var l models.League
		if err := rows.Scan(&l.ID, &l.Name, &l.OwnerID, &l.JoinCode, &l.CreatedAt, &l.MemberCount); err != nil {
			continue
		}
		leagues = append(leagues, l)
	}
	if leagues == nil {
		leagues = []models.League{}
	}

	WriteJSON(w, http.StatusOK, leagues)
}

func (h *LeagueHandler) Get(w http.ResponseWriter, r *http.Request) {
	leagueID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	// Verify user is a member
	var isMember bool
	h.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM league_memberships WHERE league_id = $1 AND user_id = $2)`,
		leagueID, userID,
	).Scan(&isMember)
	if !isMember {
		WriteError(w, http.StatusForbidden, "not a member of this league")
		return
	}

	var detail models.LeagueDetail
	err := h.pool.QueryRow(r.Context(),
		"SELECT id, name, join_code, owner_id FROM leagues WHERE id = $1", leagueID,
	).Scan(&detail.ID, &detail.Name, &detail.JoinCode, &detail.OwnerID)
	if err != nil {
		WriteError(w, http.StatusNotFound, "league not found")
		return
	}

	// Get members with total scores
	rows, err := h.pool.Query(r.Context(),
		`SELECT u.id, u.display_name, COALESCE(SUM(s.points), 0) AS total_points
		 FROM league_memberships lm
		 JOIN users u ON u.id = lm.user_id
		 LEFT JOIN scores s ON s.user_id = u.id
		 WHERE lm.league_id = $1
		 GROUP BY u.id, u.display_name
		 ORDER BY total_points DESC, u.display_name`, leagueID,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query members")
		return
	}
	defer rows.Close()

	rank := 1
	for rows.Next() {
		var m models.LeagueMember
		if err := rows.Scan(&m.UserID, &m.DisplayName, &m.TotalPoints); err != nil {
			continue
		}
		m.Rank = rank
		rank++
		detail.Members = append(detail.Members, m)
	}
	if detail.Members == nil {
		detail.Members = []models.LeagueMember{}
	}

	WriteJSON(w, http.StatusOK, detail)
}

func (h *LeagueHandler) GetRaceWeekend(w http.ResponseWriter, r *http.Request) {
	leagueID := chi.URLParam(r, "id")
	raceID := chi.URLParam(r, "raceId")
	userID := middleware.GetUserID(r.Context())

	// Verify membership
	var isMember bool
	h.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM league_memberships WHERE league_id = $1 AND user_id = $2)`,
		leagueID, userID,
	).Scan(&isMember)
	if !isMember {
		WriteError(w, http.StatusForbidden, "not a member of this league")
		return
	}

	// Get race weekend
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

	// Get all league members' predictions and scores for this race
	rows, err := h.pool.Query(r.Context(),
		`SELECT u.id, u.display_name,
		        pc.id AS cat_id, pc.name AS cat_name,
		        COALESCE(p.value, '') AS pred_value,
		        COALESCE(s.points, 0) AS points_awarded,
		        s.note
		 FROM league_memberships lm
		 JOIN users u ON u.id = lm.user_id
		 CROSS JOIN prediction_categories pc
		 LEFT JOIN predictions p ON p.user_id = u.id AND p.race_weekend_id = $1 AND p.category_id = pc.id
		 LEFT JOIN scores s ON s.user_id = u.id AND s.race_weekend_id = $1 AND s.category_id = pc.id
		 WHERE lm.league_id = $2 AND pc.is_active = true
		 ORDER BY u.display_name, pc.display_order`,
		raceID, leagueID,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to query results")
		return
	}
	defer rows.Close()

	resultMap := make(map[string]*models.LeagueRaceResult)
	var resultOrder []string

	for rows.Next() {
		var userIDVal, displayName, catID, catName, value string
		var points int
		var note *string
		if err := rows.Scan(&userIDVal, &displayName, &catID, &catName, &value, &points, &note); err != nil {
			continue
		}

		result, ok := resultMap[userIDVal]
		if !ok {
			result = &models.LeagueRaceResult{
				UserID:      userIDVal,
				DisplayName: displayName,
			}
			resultMap[userIDVal] = result
			resultOrder = append(resultOrder, userIDVal)
		}

		if value != "" {
			result.Predictions = append(result.Predictions, models.LeagueRacePredictionEntry{
				CategoryID:    catID,
				CategoryName:  catName,
				Value:         value,
				PointsAwarded: points,
				Note:          note,
			})
			result.TotalPoints += points
		}
	}

	var results []models.LeagueRaceResult
	for _, uid := range resultOrder {
		r := resultMap[uid]
		if r.Predictions == nil {
			r.Predictions = []models.LeagueRacePredictionEntry{}
		}
		results = append(results, *r)
	}
	if results == nil {
		results = []models.LeagueRaceResult{}
	}

	WriteJSON(w, http.StatusOK, models.LeagueRaceResponse{
		RaceWeekend: rw,
		Results:     results,
	})
}

func (h *LeagueHandler) Leave(w http.ResponseWriter, r *http.Request) {
	leagueID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	// Check if owner
	var ownerID string
	err := h.pool.QueryRow(r.Context(),
		"SELECT owner_id FROM leagues WHERE id = $1", leagueID,
	).Scan(&ownerID)
	if err != nil {
		WriteError(w, http.StatusNotFound, "league not found")
		return
	}

	if ownerID == userID {
		var memberCount int
		h.pool.QueryRow(r.Context(),
			"SELECT COUNT(*) FROM league_memberships WHERE league_id = $1", leagueID,
		).Scan(&memberCount)
		if memberCount > 1 {
			WriteError(w, http.StatusBadRequest, "owner cannot leave a league with other members")
			return
		}
	}

	_, err = h.pool.Exec(r.Context(),
		"DELETE FROM league_memberships WHERE league_id = $1 AND user_id = $2",
		leagueID, userID,
	)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed to leave league")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func generateJoinCode(_ context.Context, _ *pgxpool.Pool) (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 6

	for attempts := 0; attempts < 10; attempts++ {
		code := make([]byte, length)
		for i := range code {
			n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
			if err != nil {
				return "", err
			}
			code[i] = charset[n.Int64()]
		}
		return string(code), nil
	}
	return "", nil
}
