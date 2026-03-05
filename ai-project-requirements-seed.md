# P1 Predictions — Requirements & Technical Specification

> A race weekend predictions league app inspired by the **P1 with Matt and Tommy** podcast.
> Version 1.0 — Handoff to coding agent

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Design & Theming](#2-design--theming)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Race Weekend Configuration (YAML)](#5-race-weekend-configuration-yaml)
6. [API Reference](#6-api-reference)
7. [Frontend Pages & Components](#7-frontend-pages--components)
8. [Admin Panel](#8-admin-panel)
9. [Auth Flow (Supabase)](#9-auth-flow-supabase)
10. [Docker & Local Dev Setup](#10-docker--local-dev-setup)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Future Considerations](#12-future-considerations)

---

## 1. Product Overview

### 1.1 Summary

P1 Predictions is a private fantasy prediction league app built around Formula 1 race weekends. Users make predictions across a configurable set of categories before each race, then compete in friend groups via invite-code leagues. An admin awards points after the weekend — manually and subjectively, as the sole judge.

The core mechanic: **one set of predictions per user per race weekend, usable across as many leagues as the user wishes** — similar to how a March Madness bracket works across multiple pools.

### 1.2 User Roles

| Role | Description |
|------|-------------|
| `user` | Authenticated user. Makes predictions, creates leagues, joins leagues. |
| `admin` | Single privileged account. Manages prediction categories, race weekends, and awards points. |

The admin role is assigned by setting `is_admin = true` in the database for a specific user UUID. There is no self-serve admin registration.

### 1.3 Core Concepts

| Concept | Description |
|---------|-------------|
| **Race Weekend** | A single F1 grand prix. Has a name, round number, circuit, race date, prediction lock time, sprint flag, and cancelled flag. Seeded from YAML. |
| **Prediction Category** | A configurable type of prediction (e.g. "Good Surprise", "Pole Position"). Admin-managed. Has a point value, display order, and a flag for sprint-only visibility. |
| **Prediction** | A user's text answer to a category for a given race weekend. Locked after the race weekend's lock time. |
| **League** | A named group of users. Has an owner, a unique 6-character alphanumeric join code, and a creation date. |
| **League Membership** | Join record linking a user to a league. |
| **Score** | Points awarded by admin to a user for a specific prediction category in a specific race weekend. Editable after the fact. |

---

## 2. Design & Theming

### 2.1 About & Inspiration

Every page footer must include a brief credit. A dedicated `/about` page must include:

> *"This app was inspired by the weekly predictions segment on the P1 with Matt and Tommy podcast — the world's biggest F1 podcast, hosted by Matt Gallagher and Tom Bellingham. Every race weekend, Matt and Tommy go head-to-head across categories like Good Surprise, Big Flop, Pole Position, Top 3, and a Crazy Prediction. We just made it multiplayer."*

Link to `https://mattp1tommy.com` and suggest finding the podcast on Spotify, Apple Podcasts, or wherever listeners get their pods.

### 2.2 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--f1-red` | `#E10600` | Primary CTAs, active nav, key accents |
| `--f1-black` | `#15151E` | Page background |
| `--f1-dark` | `#1E1E2E` | Card / panel backgrounds |
| `--f1-silver` | `#9A9A9A` | Secondary / muted text |
| `--f1-white` | `#F5F5F5` | Primary body text |
| `--p1-yellow` | `#FFD700` | Leading score highlights, P1 badge |
| `--p1-green` | `#39FF14` | Correct prediction indicator |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Card borders |

**Dark mode only.** No light mode required.

### 2.3 Typography

- Headings: `'Formula1'` display font if licensed/available, otherwise `'Inter'` weight 800, uppercase
- Body: `'Inter'`, weight 400/500
- Circuit/race names: uppercase, wide letter-spacing (`tracking-widest`)
- Monospaced elements (join codes, scores): `'JetBrains Mono'` or system mono

### 2.4 UI Component Notes

- Use **shadcn/ui** as the base component library, customised with the above palette via Tailwind CSS variables
- Cards: dark background, subtle border, slight `backdrop-blur` where layered over hero backgrounds
- Buttons: primary = red fill, white text; secondary = transparent with red border
- Leaderboard rows: gold/silver/bronze tint on top 3 positions (`#FFD700`, `#C0C0C0`, `#CD7F32` at 15% opacity)
- Status chips:
    - `OPEN` → green outline
    - `LOCKED` → amber outline
    - `SCORED` → red fill
    - `CANCELLED` → grey, strikethrough race name
- Checkered flag motif: use as SVG section divider or subtle hero background pattern
- The P1 podcast logo / wordmark should appear on the `/about` page

---

## 3. System Architecture

### 3.1 Stack Summary

**Backend**
- Language: Go 1.21+
- Router: `github.com/go-chi/chi/v5`
- Database: PostgreSQL via `github.com/jackc/pgx/v5` (pgx driver, no CGO required)
- Auth: Supabase JWT verification (JWKS or shared secret)
- Config: `.env` file, loaded via `github.com/joho/godotenv`
- Race calendar: YAML file (`/config/seasons/2026.yaml`), parsed at startup

**Frontend**
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui
- Data fetching: SWR
- Auth: `@supabase/supabase-js` + `@supabase/auth-helpers-nextjs`

**Infrastructure**
- Docker + Docker Compose for local development
- SQLite database file persisted via named Docker volume
- Frontend and backend run as separate containers

### 3.2 Architecture Diagram

```
┌──────────────────────────────────┐
│           Browser                │
│  Next.js App (port 3000)         │
│  · Supabase JS handles auth      │
│  · SWR fetches from Go API       │
└──────────────┬───────────────────┘
               │ HTTP/JSON
               │ Authorization: Bearer <supabase_jwt>
               ▼
┌──────────────────────────────────┐
│     Go API Server (port 8080)    │
│  · chi router                    │
│  · Supabase JWT middleware       │
│  · SQLite read/write             │
│  · Loads 2026.yaml at startup    │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  PostgreSQL (port 5432)          │
│  · Local: Docker container       │
│  · Production: Supabase Postgres │
└──────────────────────────────────┘

     ┌──────────────────────┐
     │  Supabase (external) │
     │  · Auth / JWT issuer │
     │  · Email login only  │
     └──────────────────────┘
```

### 3.3 Repo Structure

```
p1predictions/
├── backend/
│   ├── main.go
│   ├── config/
│   │   └── seasons/
│   │       └── 2026.yaml          # Race weekend definitions
│   ├── handlers/
│   ├── middleware/
│   ├── models/
│   ├── db/
│   │   └── migrations/
│   └── Dockerfile
├── frontend/
│   ├── app/                       # Next.js App Router
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Database Schema

All tables use PostgreSQL. UUIDs use the `uuid` type with `gen_random_uuid()` as default. Timestamps use `TIMESTAMPTZ`.

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
    id           UUID PRIMARY KEY,   -- Supabase auth UUID
    email        TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prediction Categories
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

-- Race Weekends
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

-- Predictions
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

-- Leagues
CREATE TABLE leagues (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    owner_id    UUID NOT NULL REFERENCES users(id),
    join_code   TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- League Memberships
CREATE TABLE league_memberships (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id),
    user_id   UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(league_id, user_id)
);

-- Scores
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

-- Indexes
CREATE INDEX idx_predictions_user_race ON predictions(user_id, race_weekend_id);
CREATE INDEX idx_scores_user_race ON scores(user_id, race_weekend_id);
CREATE INDEX idx_scores_race ON scores(race_weekend_id);
CREATE INDEX idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX idx_league_memberships_user ON league_memberships(user_id);
```

---

## 5. Race Weekend Configuration (YAML)

### 5.1 Format

Race weekends are defined in `/backend/config/seasons/2026.yaml`. The backend loads this file at startup and **upserts** records into `race_weekends` using `round` + `season` as a natural key. Fields explicitly overridden in the database (e.g. `is_cancelled`) are not overwritten by the YAML on subsequent startups — DB values win for mutable fields.

**Immutable from YAML** (never overwritten by DB after first insert): `season`, `round`, `name`, `short_name`, `circuit`, `country`, `is_sprint`

**Mutable** (can be changed via admin UI, stored in DB): `race_date`, `lock_time`, `is_cancelled`

```yaml
# /backend/config/seasons/2026.yaml
season: 2026
races:
  - round: 1
    name: "Australian Grand Prix"
    short_name: "Australia"
    circuit: "Albert Park Circuit"
    country: "Australia"
    race_date: "2026-03-08T05:00:00Z"
    lock_time: "2026-03-08T04:00:00Z"   # 1hr before race start
    is_sprint: false

  - round: 2
    name: "Chinese Grand Prix"
    short_name: "China"
    circuit: "Shanghai International Circuit"
    country: "China"
    race_date: "2026-03-15T07:00:00Z"
    lock_time: "2026-03-14T08:00:00Z"   # Sprint weekend: lock before sprint qualifying
    is_sprint: true

  - round: 3
    name: "Japanese Grand Prix"
    short_name: "Japan"
    circuit: "Suzuka International Racing Course"
    country: "Japan"
    race_date: "2026-03-29T05:00:00Z"
    lock_time: "2026-03-29T04:00:00Z"
    is_sprint: false

  - round: 4
    name: "Bahrain Grand Prix"
    short_name: "Bahrain"
    circuit: "Bahrain International Circuit"
    country: "Bahrain"
    race_date: "2026-04-12T15:00:00Z"
    lock_time: "2026-04-12T14:00:00Z"
    is_sprint: false

  - round: 5
    name: "Saudi Arabian Grand Prix"
    short_name: "Saudi Arabia"
    circuit: "Jeddah Corniche Circuit"
    country: "Saudi Arabia"
    race_date: "2026-04-19T17:00:00Z"
    lock_time: "2026-04-19T16:00:00Z"
    is_sprint: false

  - round: 6
    name: "Miami Grand Prix"
    short_name: "Miami"
    circuit: "Miami International Autodrome"
    country: "United States"
    race_date: "2026-05-03T19:00:00Z"
    lock_time: "2026-05-02T19:00:00Z"   # Sprint weekend
    is_sprint: true

  - round: 7
    name: "Canadian Grand Prix"
    short_name: "Canada"
    circuit: "Circuit Gilles Villeneuve"
    country: "Canada"
    race_date: "2026-05-24T18:00:00Z"
    lock_time: "2026-05-23T18:00:00Z"   # Sprint weekend
    is_sprint: true

  - round: 8
    name: "Monaco Grand Prix"
    short_name: "Monaco"
    circuit: "Circuit de Monaco"
    country: "Monaco"
    race_date: "2026-06-07T13:00:00Z"
    lock_time: "2026-06-07T12:00:00Z"
    is_sprint: false

  - round: 9
    name: "Barcelona-Catalunya Grand Prix"
    short_name: "Barcelona"
    circuit: "Circuit de Barcelona-Catalunya"
    country: "Spain"
    race_date: "2026-06-14T13:00:00Z"
    lock_time: "2026-06-14T12:00:00Z"
    is_sprint: false

  - round: 10
    name: "Austrian Grand Prix"
    short_name: "Austria"
    circuit: "Red Bull Ring"
    country: "Austria"
    race_date: "2026-06-28T13:00:00Z"
    lock_time: "2026-06-28T12:00:00Z"
    is_sprint: false

  - round: 11
    name: "British Grand Prix"
    short_name: "Great Britain"
    circuit: "Silverstone Circuit"
    country: "United Kingdom"
    race_date: "2026-07-05T14:00:00Z"
    lock_time: "2026-07-04T14:00:00Z"   # Sprint weekend
    is_sprint: true

  - round: 12
    name: "Belgian Grand Prix"
    short_name: "Belgium"
    circuit: "Circuit de Spa-Francorchamps"
    country: "Belgium"
    race_date: "2026-07-19T13:00:00Z"
    lock_time: "2026-07-19T12:00:00Z"
    is_sprint: false

  - round: 13
    name: "Hungarian Grand Prix"
    short_name: "Hungary"
    circuit: "Hungaroring"
    country: "Hungary"
    race_date: "2026-07-26T13:00:00Z"
    lock_time: "2026-07-26T12:00:00Z"
    is_sprint: false

  - round: 14
    name: "Dutch Grand Prix"
    short_name: "Netherlands"
    circuit: "Circuit Zandvoort"
    country: "Netherlands"
    race_date: "2026-08-23T13:00:00Z"
    lock_time: "2026-08-22T13:00:00Z"   # Sprint weekend
    is_sprint: true

  - round: 15
    name: "Italian Grand Prix"
    short_name: "Italy"
    circuit: "Autodromo Nazionale Monza"
    country: "Italy"
    race_date: "2026-09-06T13:00:00Z"
    lock_time: "2026-09-06T12:00:00Z"
    is_sprint: false

  - round: 16
    name: "Madrid Grand Prix"
    short_name: "Madrid"
    circuit: "Madrid Street Circuit"
    country: "Spain"
    race_date: "2026-09-13T13:00:00Z"
    lock_time: "2026-09-13T12:00:00Z"
    is_sprint: false

  - round: 17
    name: "Azerbaijan Grand Prix"
    short_name: "Azerbaijan"
    circuit: "Baku City Circuit"
    country: "Azerbaijan"
    race_date: "2026-09-26T11:00:00Z"   # Saturday race
    lock_time: "2026-09-26T10:00:00Z"
    is_sprint: false

  - round: 18
    name: "Singapore Grand Prix"
    short_name: "Singapore"
    circuit: "Marina Bay Street Circuit"
    country: "Singapore"
    race_date: "2026-10-11T13:00:00Z"
    lock_time: "2026-10-10T13:00:00Z"   # Sprint weekend
    is_sprint: true

  - round: 19
    name: "United States Grand Prix"
    short_name: "USA"
    circuit: "Circuit of the Americas"
    country: "United States"
    race_date: "2026-10-25T19:00:00Z"
    lock_time: "2026-10-25T18:00:00Z"
    is_sprint: false

  - round: 20
    name: "Mexico City Grand Prix"
    short_name: "Mexico"
    circuit: "Autodromo Hermanos Rodriguez"
    country: "Mexico"
    race_date: "2026-11-01T19:00:00Z"
    lock_time: "2026-11-01T18:00:00Z"
    is_sprint: false

  - round: 21
    name: "São Paulo Grand Prix"
    short_name: "Brazil"
    circuit: "Autodromo Jose Carlos Pace"
    country: "Brazil"
    race_date: "2026-11-08T17:00:00Z"
    lock_time: "2026-11-08T16:00:00Z"
    is_sprint: false

  - round: 22
    name: "Las Vegas Grand Prix"
    short_name: "Las Vegas"
    circuit: "Las Vegas Strip Circuit"
    country: "United States"
    race_date: "2026-11-21T06:00:00Z"   # Saturday night local = Sunday UTC
    lock_time: "2026-11-21T05:00:00Z"
    is_sprint: false

  - round: 23
    name: "Qatar Grand Prix"
    short_name: "Qatar"
    circuit: "Lusail International Circuit"
    country: "Qatar"
    race_date: "2026-11-29T16:00:00Z"
    lock_time: "2026-11-29T15:00:00Z"
    is_sprint: false

  - round: 24
    name: "Abu Dhabi Grand Prix"
    short_name: "Abu Dhabi"
    circuit: "Yas Marina Circuit"
    country: "United Arab Emirates"
    race_date: "2026-12-06T13:00:00Z"
    lock_time: "2026-12-06T12:00:00Z"
    is_sprint: false
```

### 5.2 Admin Override Behaviour

When the admin edits a race weekend via the admin UI, changes are written to the `race_weekends` table. The YAML is **not** modified at runtime — it is the seed file only. To permanently change the canonical calendar, the admin edits the YAML file and restarts the backend, or uses the API to patch only mutable fields.

Cancelling a race: `PATCH /admin/race-weekends/:id` with `{ "is_cancelled": true }`. Cancelled races appear greyed out in the UI and accept no new predictions.

---

## 6. API Reference

All endpoints are prefixed `/api/v1`. All requests (except `/auth/*` unauthenticated flows) require `Authorization: Bearer <jwt>`. The backend validates the JWT against Supabase's public key.

Responses are JSON. Errors follow the shape `{ "error": "message" }`.

---

### 6.1 Auth & User Bootstrap

#### `POST /api/v1/auth/me`
Called by the frontend immediately after Supabase login. Creates the user record in SQLite if it doesn't exist. Returns the user object.

**Request body:**
```json
{
  "display_name": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "string",
  "is_admin": false,
  "created_at": 1234567890
}
```

---

### 6.2 Race Weekends

#### `GET /api/v1/race-weekends`
Returns all non-cancelled race weekends for the current season, ordered by round. Includes a computed `status` field: `upcoming`, `open`, `locked`, `scored`.

- `upcoming` — lock_time is in the future and no predictions exist for the requesting user
- `open` — lock_time is in the future and user has at least one prediction saved
- `locked` — lock_time has passed, not yet scored
- `scored` — at least one score record exists for this weekend

**Response:**
```json
[
  {
    "id": "uuid",
    "season": 2026,
    "round": 1,
    "name": "Australian Grand Prix",
    "short_name": "Australia",
    "circuit": "Albert Park Circuit",
    "country": "Australia",
    "race_date": 1741406400,
    "lock_time": 1741402800,
    "is_sprint": false,
    "is_cancelled": false,
    "status": "scored"
  }
]
```

#### `GET /api/v1/race-weekends/:id`
Returns a single race weekend with the requesting user's predictions (if any) and their scores (if awarded).

**Response:**
```json
{
  "race_weekend": { ...weekend fields... },
  "categories": [
    {
      "id": "uuid",
      "name": "Good Surprise",
      "description": "Pick a driver you think will outperform expectations",
      "points": 1,
      "display_order": 1,
      "is_sprint_only": false
    }
  ],
  "predictions": [
    {
      "category_id": "uuid",
      "value": "Charles Leclerc",
      "updated_at": 1741300000
    }
  ],
  "scores": [
    {
      "category_id": "uuid",
      "points": 1,
      "note": "Leclerc P2 — good surprise confirmed"
    }
  ]
}
```

---

### 6.3 Predictions

#### `PUT /api/v1/race-weekends/:id/predictions`
Upserts the requesting user's predictions for a race weekend. Rejected if `lock_time` has passed. Entire set is submitted together.

**Request body:**
```json
{
  "predictions": [
    { "category_id": "uuid", "value": "Max Verstappen" },
    { "category_id": "uuid", "value": "Lando Norris" }
  ]
}
```

**Response:** `200 OK` with updated predictions array, or `403 Forbidden` if locked.

---

### 6.4 Leagues

#### `POST /api/v1/leagues`
Creates a new league. The creating user becomes the owner and is automatically added as a member.

**Request body:**
```json
{ "name": "The Grid Gossips" }
```

**Response:**
```json
{
  "id": "uuid",
  "name": "The Grid Gossips",
  "owner_id": "uuid",
  "join_code": "GX4R2K",
  "member_count": 1,
  "created_at": 1234567890
}
```

#### `POST /api/v1/leagues/join`
Join a league by code.

**Request body:**
```json
{ "join_code": "GX4R2K" }
```

**Response:** `200 OK` with league object, or `404` if code not found, `409` if already a member.

#### `GET /api/v1/leagues`
Returns all leagues the requesting user is a member of.

#### `GET /api/v1/leagues/:id`
Returns league details, member list, and the leaderboard (cumulative scores across all scored weekends).

**Response:**
```json
{
  "id": "uuid",
  "name": "The Grid Gossips",
  "join_code": "GX4R2K",
  "owner_id": "uuid",
  "members": [
    {
      "user_id": "uuid",
      "display_name": "Tommy",
      "total_points": 42,
      "rank": 1
    }
  ]
}
```

#### `GET /api/v1/leagues/:id/race-weekends/:race_id`
Returns the leaderboard for a specific race weekend within a league — showing each member's predictions and scores side by side.

**Response:**
```json
{
  "race_weekend": { ...weekend fields... },
  "results": [
    {
      "user_id": "uuid",
      "display_name": "Tommy",
      "total_points": 3,
      "predictions": [
        {
          "category_id": "uuid",
          "category_name": "Good Surprise",
          "value": "Charles Leclerc",
          "points_awarded": 1,
          "note": "Correct"
        }
      ]
    }
  ]
}
```

#### `DELETE /api/v1/leagues/:id/leave`
Leave a league. Owners cannot leave if there are other members (must transfer or disband).

---

### 6.5 Admin — Categories

All `/admin/*` routes require `is_admin = true` on the requesting user, enforced in middleware.

#### `GET /api/v1/admin/categories`
List all prediction categories.

#### `POST /api/v1/admin/categories`
Create a new category.

**Request body:**
```json
{
  "name": "Crazy Prediction",
  "description": "Your wildest long-shot call for the weekend",
  "points": 2,
  "display_order": 6,
  "is_sprint_only": false
}
```

#### `PATCH /api/v1/admin/categories/:id`
Update any field on a category. Changing `points` does not retroactively update existing `scores` rows — those must be re-awarded.

#### `DELETE /api/v1/admin/categories/:id`
Soft-delete (sets `is_active = false`). Does not delete existing predictions or scores.

---

### 6.6 Admin — Race Weekends

#### `GET /api/v1/admin/race-weekends`
List all race weekends including cancelled ones.

#### `PATCH /api/v1/admin/race-weekends/:id`
Update mutable fields: `race_date`, `lock_time`, `is_cancelled`.

**Request body (all fields optional):**
```json
{
  "race_date": 1741406400,
  "lock_time": 1741402800,
  "is_cancelled": false
}
```

---

### 6.7 Admin — Scoring

#### `GET /api/v1/admin/race-weekends/:id/scores`
Returns all users who have submitted predictions for this weekend, grouped by user, showing their prediction values alongside current scores (if any).

#### `PUT /api/v1/admin/race-weekends/:id/scores`
Upserts scores for all users for a given weekend. This is the primary scoring interface. Replaces all existing scores for the weekend on each call.

**Request body:**
```json
{
  "scores": [
    {
      "user_id": "uuid",
      "category_id": "uuid",
      "points": 1,
      "note": "Correct — Leclerc P2"
    },
    {
      "user_id": "uuid",
      "category_id": "uuid",
      "points": 0,
      "note": "Incorrect — Norris DNF"
    }
  ]
}
```

**Response:** `200 OK` with updated score rows.

---

## 7. Frontend Pages & Components

### 7.1 Page Map

| Route | Description | Auth |
|-------|-------------|------|
| `/` | Landing / home page | Public |
| `/login` | Supabase email+password login | Public |
| `/register` | Supabase email+password registration | Public |
| `/dashboard` | User's race weekends overview | Required |
| `/race/:id` | Prediction entry form for a weekend | Required |
| `/leagues` | User's leagues list | Required |
| `/leagues/new` | Create a league | Required |
| `/leagues/join` | Join by code | Required |
| `/leagues/:id` | League leaderboard | Required |
| `/leagues/:id/race/:race_id` | Per-race breakdown within league | Required |
| `/about` | About + P1 podcast credit | Public |
| `/admin` | Admin dashboard (redirect if not admin) | Admin only |
| `/admin/categories` | Manage prediction categories | Admin only |
| `/admin/race-weekends` | View/edit race calendar | Admin only |
| `/admin/score/:race_id` | Award points for a weekend | Admin only |

---

### 7.2 Key Components

#### `RaceWeekendCard`
Used on `/dashboard`. Shows round number, race name, country flag emoji, circuit, race date, and a status chip (`OPEN`, `LOCKED`, `SCORED`, `CANCELLED`). Clicking navigates to `/race/:id`.

#### `PredictionForm`
Used on `/race/:id`. Renders one text input per active prediction category. Sprint-only categories are hidden if `is_sprint = false`. Form is disabled (read-only) if `lock_time` has passed. Shows a countdown to lock time if within 24 hours. Saving sends `PUT /api/v1/race-weekends/:id/predictions`.

#### `LeagueLeaderboard`
Used on `/leagues/:id`. Ranked table of members with total points. Top 3 highlighted gold/silver/bronze. Shows current user's row with highlight.

#### `RaceResultsTable`
Used on `/leagues/:id/race/:race_id`. Grid of all members × all categories. Shows prediction text and points awarded in each cell. Admin notes available as tooltip.

#### `AdminScoringPanel`
Used on `/admin/score/:race_id`. Shows a table of all users who submitted predictions. Each row has the user's prediction per category and an editable score input (number) with a note field. A single "Save All Scores" button submits the full set.

---

### 7.3 Shared UI Notes

- **Countdown timer** component: displays live countdown to lock time for open weekends
- **Join code display**: monospaced, large, copyable — shown prominently on league detail page
- **Empty states**: use F1-themed copy, e.g. "No leagues yet — create one and send the code to your grid"
- **Toast notifications**: SWR mutation success/error feedback via shadcn/ui `Toast`

---

## 8. Admin Panel

The admin panel is a set of protected routes within the main Next.js app (not a separate service). Access is gated by `is_admin` on the user object returned from `/api/v1/auth/me`.

### 8.1 Categories Management (`/admin/categories`)

- Table listing all categories (including inactive)
- Inline edit for `name`, `description`, `points`, `display_order`, `is_sprint_only`, `is_active`
- "Add Category" button opens a modal form
- Drag-to-reorder for `display_order` (or manual number entry as fallback)
- Warning before deactivating a category that has existing predictions

### 8.2 Race Calendar Management (`/admin/race-weekends`)

- Table of all 24 rounds showing: round, name, circuit, race date, lock time, sprint flag, cancelled flag
- Inline edit for `race_date`, `lock_time`
- Toggle to mark as cancelled (with confirmation dialog)
- Cancelled races shown with strikethrough styling
- Note displayed: *"The 2026 season is seeded from `config/seasons/2026.yaml`. Edit that file and restart to make permanent changes to the base calendar."*

### 8.3 Scoring Panel (`/admin/score/:race_id`)

The core admin workflow. Accessed from a list of past/current race weekends.

**Layout:**
- Race weekend header (name, round, date)
- Filter: show only users who submitted predictions (default), or all users
- Table columns: User | [Category 1] | [Category 2] | ... | Total
- Each cell: prediction value shown above a numeric score input + small note textarea
- A user row with no prediction for a category shows "—" and score input disabled
- "Save All Scores" at top and bottom of table
- After saving, scores are reflected immediately in all league leaderboards

**Scoring rules (enforced in UI, not backend):**
- Score input accepts integers ≥ 0
- Default point value per category is pre-filled from the category's `points` field
- Admin can override to any value (including 0 or higher than default for bonus points)
- No hard validation — admin is the sole judge

---

## 9. Auth Flow (Supabase)

### 9.1 Frontend

1. User visits `/login` or `/register`
2. Supabase JS client handles email/password login or signup
3. On success, Supabase issues a JWT stored in browser localStorage/cookie via `@supabase/auth-helpers-nextjs`
4. Frontend immediately calls `POST /api/v1/auth/me` with the JWT to bootstrap the user record in SQLite and get the app-level user object (including `is_admin`)
5. `is_admin` stored in client-side session context; used to show/hide admin nav links

### 9.2 Backend JWT Verification

The Go backend verifies every request's JWT using Supabase's JWKS endpoint:

```
https://<your-supabase-project>.supabase.co/auth/v1/.well-known/jwks.json
```

Or, for local development simplicity, using the Supabase `JWT_SECRET` for HMAC verification.

Middleware extracts `sub` (user UUID) and `email` from claims and injects them into request context. All handlers read user identity from context — never from request body.

### 9.3 Environment Variables

```bash
# Backend
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
DATABASE_URL=postgres://postgres:password@db:5432/p1predictions
PORT=8080
SEASON_CONFIG_PATH=/app/config/seasons/2026.yaml

# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

---

## 10. Docker & Local Dev Setup

### 10.1 `docker-compose.yml`

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: p1predictions
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    volumes:
      - ./backend/config:/app/config:ro
    env_file:
      - .env
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - backend

volumes:
  postgres-data:
```

### 10.2 Backend Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o p1predictions ./main.go

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/p1predictions .
COPY --from=builder /app/config ./config
EXPOSE 8080
CMD ["./p1predictions"]
```

### 10.3 Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 10.4 Getting Started (README excerpt)

```bash
# 1. Clone the repo
git clone https://github.com/yourname/p1predictions
cd p1predictions

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your Supabase project URL, anon key, and JWT secret
# DATABASE_URL will default to the local Docker Postgres in docker-compose

# 3. Start everything
docker compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
# Postgres: localhost:5432

# 4. Set yourself as admin
# After registering via the UI, find your Supabase UUID and run:
docker compose exec backend ./p1predictions set-admin <your-supabase-uuid>
```

**Production (Supabase Postgres):** swap `DATABASE_URL` in your environment to your Supabase connection string (Session mode pooler recommended). No other changes needed.

---

## 11. Non-Functional Requirements

| Concern | Requirement |
|---------|-------------|
| **Lock enforcement** | Backend must reject prediction writes if `lock_time < now()`. Never trust the frontend for this. |
| **Admin auth** | All `/admin/*` API routes must verify `is_admin = true` in middleware — not just the frontend route guard. |
| **Idempotency** | `PUT` predictions and `PUT` scores are fully idempotent upserts. |
| **Timezone** | All times stored and transmitted as UTC Unix timestamps. Frontend converts to user's local timezone for display. |
| **Join code uniqueness** | Generated server-side using a cryptographically random 6-character alphanumeric string. Collisions retried automatically. |
| **CORS** | Backend allows requests from `http://localhost:3000` in development. Production origin configurable via env var. |
| **Migrations** | Use a simple migration tool (e.g. `golang-migrate`) to manage schema versions. Migration files live in `backend/db/migrations/`. |
| **Connection pooling** | Use `pgxpool` for the backend database connection pool. Set `max_conns` via env var, default 10. |
| **No pagination required** | Season has 24 races, leagues are small friend groups. Simple full-list responses are fine for v1. |
| **No email sending** | League invites are share-the-code only. No transactional email in scope. |

---

## 12. Future Considerations

These are **out of scope for v1** but worth designing around:

- **Push notifications / reminders** — "Predictions close in 2 hours" alerts
- **Historical seasons** — multi-season support, year selector in UI
- **Public leagues** — discoverable leagues without a join code
- **Prediction templates** — pre-fill based on last week's picks
- **Stats page** — per-user accuracy breakdown by category over the season
- **Points multipliers** — double-pointer categories (matching the P1 podcast's "Big Flop" double pointer mechanic)
- **Mobile app** — the use case is naturally mobile (submitting predictions before a Sunday race)
- **Admin score history** — audit log of score changes with timestamps

---

*Built with love for the P1 community. Inspired by Matt Gallagher and Tom Bellingham — find the podcast at [mattp1tommy.com](https://mattp1tommy.com).*