package models

import "time"

type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"display_name"`
	IsAdmin     bool      `json:"is_admin"`
	CreatedAt   time.Time `json:"created_at"`
}

type PredictionCategory struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  *string   `json:"description"`
	Points       int       `json:"points"`
	DisplayOrder int       `json:"display_order"`
	IsSprintOnly bool      `json:"is_sprint_only"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

type RaceWeekend struct {
	ID          string    `json:"id"`
	Season      int       `json:"season"`
	Round       int       `json:"round"`
	Name        string    `json:"name"`
	ShortName   string    `json:"short_name"`
	Circuit     string    `json:"circuit"`
	Country     string    `json:"country"`
	RaceDate    time.Time `json:"race_date"`
	LockTime    time.Time `json:"lock_time"`
	IsSprint    bool      `json:"is_sprint"`
	IsCancelled bool      `json:"is_cancelled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Status      string    `json:"status,omitempty"`
}

type Prediction struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	RaceWeekendID string    `json:"race_weekend_id"`
	CategoryID    string    `json:"category_id"`
	Value         string    `json:"value"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type League struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	OwnerID     string    `json:"owner_id"`
	JoinCode    string    `json:"join_code"`
	MemberCount int       `json:"member_count,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type LeagueMembership struct {
	ID       string    `json:"id"`
	LeagueID string    `json:"league_id"`
	UserID   string    `json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
}

type Score struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	RaceWeekendID string    `json:"race_weekend_id"`
	CategoryID    string    `json:"category_id"`
	Points        int       `json:"points"`
	Note          *string   `json:"note"`
	AwardedAt     time.Time `json:"awarded_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// API request/response types

type AuthMeRequest struct {
	DisplayName string `json:"display_name"`
}

type PredictionInput struct {
	CategoryID string `json:"category_id"`
	Value      string `json:"value"`
}

type PredictionsRequest struct {
	Predictions []PredictionInput `json:"predictions"`
}

type CreateLeagueRequest struct {
	Name string `json:"name"`
}

type JoinLeagueRequest struct {
	JoinCode string `json:"join_code"`
}

type ScoreInput struct {
	UserID     string  `json:"user_id"`
	CategoryID string  `json:"category_id"`
	Points     int     `json:"points"`
	Note       *string `json:"note"`
}

type ScoresRequest struct {
	Scores []ScoreInput `json:"scores"`
}

type CategoryRequest struct {
	Name         string  `json:"name"`
	Description  *string `json:"description"`
	Points       int     `json:"points"`
	DisplayOrder int     `json:"display_order"`
	IsSprintOnly bool    `json:"is_sprint_only"`
}

type PatchRaceWeekendRequest struct {
	RaceDate    *int64 `json:"race_date"`
	LockTime    *int64 `json:"lock_time"`
	IsCancelled *bool  `json:"is_cancelled"`
}

// Response types

type RaceWeekendDetail struct {
	RaceWeekend RaceWeekend          `json:"race_weekend"`
	Categories  []PredictionCategory `json:"categories"`
	Predictions []PredictionResponse `json:"predictions"`
	Scores      []ScoreResponse      `json:"scores"`
}

type PredictionResponse struct {
	CategoryID string `json:"category_id"`
	Value      string `json:"value"`
	UpdatedAt  int64  `json:"updated_at"`
}

type ScoreResponse struct {
	CategoryID string  `json:"category_id"`
	Points     int     `json:"points"`
	Note       *string `json:"note"`
}

type LeagueMember struct {
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	TotalPoints int    `json:"total_points"`
	Rank        int    `json:"rank"`
}

type LeagueDetail struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	JoinCode string         `json:"join_code"`
	OwnerID  string         `json:"owner_id"`
	Members  []LeagueMember `json:"members"`
}

type LeagueRaceResult struct {
	UserID      string                      `json:"user_id"`
	DisplayName string                      `json:"display_name"`
	TotalPoints int                         `json:"total_points"`
	Predictions []LeagueRacePredictionEntry `json:"predictions"`
}

type LeagueRacePredictionEntry struct {
	CategoryID    string  `json:"category_id"`
	CategoryName  string  `json:"category_name"`
	Value         string  `json:"value"`
	PointsAwarded int     `json:"points_awarded"`
	Note          *string `json:"note"`
}

type LeagueRaceResponse struct {
	RaceWeekend RaceWeekend        `json:"race_weekend"`
	Results     []LeagueRaceResult `json:"results"`
}

type AdminScoreEntry struct {
	UserID      string                    `json:"user_id"`
	DisplayName string                    `json:"display_name"`
	Predictions []AdminPredictionWithScore `json:"predictions"`
}

type AdminPredictionWithScore struct {
	CategoryID string  `json:"category_id"`
	Value      string  `json:"value"`
	Points     *int    `json:"points"`
	Note       *string `json:"note"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
