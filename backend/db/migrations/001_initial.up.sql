CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id           UUID PRIMARY KEY,
    email        TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prediction_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    description   TEXT,
    points        INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_sprint_only BOOLEAN NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE race_weekends (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season       INTEGER NOT NULL,
    round        INTEGER NOT NULL,
    name         TEXT NOT NULL,
    short_name   TEXT NOT NULL,
    circuit      TEXT NOT NULL,
    country      TEXT NOT NULL,
    race_date    TIMESTAMPTZ NOT NULL,
    lock_time    TIMESTAMPTZ NOT NULL,
    is_sprint    BOOLEAN NOT NULL DEFAULT FALSE,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(season, round)
);

CREATE TABLE predictions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    race_weekend_id UUID NOT NULL REFERENCES race_weekends(id),
    category_id     UUID NOT NULL REFERENCES prediction_categories(id),
    value           TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, race_weekend_id, category_id)
);

CREATE TABLE leagues (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    owner_id    UUID NOT NULL REFERENCES users(id),
    join_code   TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE league_memberships (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id),
    user_id   UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(league_id, user_id)
);

CREATE TABLE scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    race_weekend_id UUID NOT NULL REFERENCES race_weekends(id),
    category_id     UUID NOT NULL REFERENCES prediction_categories(id),
    points          INTEGER NOT NULL DEFAULT 0,
    note            TEXT,
    awarded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, race_weekend_id, category_id)
);

CREATE INDEX idx_predictions_user_race ON predictions(user_id, race_weekend_id);
CREATE INDEX idx_scores_user_race ON scores(user_id, race_weekend_id);
CREATE INDEX idx_scores_race ON scores(race_weekend_id);
CREATE INDEX idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX idx_league_memberships_user ON league_memberships(user_id);
