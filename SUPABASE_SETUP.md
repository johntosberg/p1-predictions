# Supabase Setup Guide for P1 Predictions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose your organization, give it a name (e.g. "P1 Predictions"), pick a region close to your Mac Mini, and set a database password
4. Wait for the project to provision (~2 minutes)

## 2. Get Your Credentials

All credentials are in **Project Settings** (gear icon in the left sidebar):

### API Keys (Settings → API)

| .env variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** — looks like `https://abcdefghijkl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project API keys → anon / public** — the long `eyJ...` key labeled "anon" |
| `SUPABASE_JWT_SECRET` | **JWT Settings → JWT Secret** — scroll down on the same API page, it's under "JWT Settings" |

### Database Connection (Settings → Database)

| .env variable | Where to find it |
|---|---|
| `DATABASE_URL` | **Connection string → URI** — under "Connection parameters", click "URI" tab. Use the **Session mode** pooler URI for production. Looks like `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres` |

> **Important**: Use the **Session mode pooler** connection string (port 5432), not the direct connection. This works best with pgx connection pooling.

## 3. Configure Auth

### Enable Email Auth (Authentication → Providers)

1. Go to **Authentication** in the left sidebar
2. Click **Providers**
3. **Email** should already be enabled by default
4. Recommended settings:
   - **Confirm email**: ON for production (OFF for local testing if you want faster iteration)
   - **Secure email change**: ON
   - **Enable signup**: ON (you can disable later to close registration)

### Disable Auto-Confirm for Production

Go to **Authentication → Settings**:
- For production: keep "Confirm email" enabled so users must verify their email
- For testing: you can disable it so signups work instantly

### (Optional) Custom SMTP

By default, Supabase sends emails from their shared mail server with a rate limit. For production with more than a few users:

1. Go to **Project Settings → Authentication → SMTP Settings**
2. Toggle "Enable Custom SMTP"
3. Enter your SMTP credentials (e.g. Resend, Postmark, or any SMTP provider)

## 4. Your Complete .env File

```bash
# Backend
SUPABASE_JWT_SECRET=your-jwt-secret-from-step-2
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
PORT=8080
SEASON_CONFIG_PATH=/app/config/seasons/2026.yaml
CORS_ORIGIN=http://your-mac-mini-ip:3000
DB_MAX_CONNS=10

# Frontend (these are baked into the Docker image at build time)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://your-mac-mini-ip:8080/api/v1
```

## 5. Deploy on Mac Mini

```bash
# 1. Clone/copy the repo to your Mac Mini
# 2. Create .env with your real Supabase credentials from above
# 3. Remove or comment out the `db` service in docker-compose.yml
#    (you're using Supabase's hosted Postgres instead)
# 4. Build and start
docker compose up --build -d

# 5. Register via the UI at http://your-mac-mini-ip:3000
# 6. Find your user UUID in the Supabase dashboard:
#    Authentication → Users → click your user → copy the UUID
# 7. Set yourself as admin:
docker compose exec backend ./p1predictions set-admin <your-uuid>

# 8. Go to Admin → Categories and create your prediction categories:
#    - Good Surprise (1 pt)
#    - Big Flop (1 pt)
#    - Pole Position (1 pt)
#    - Top 3 (1 pt)
#    - Crazy Prediction (2 pts)
```

## 6. Notes

- **No Supabase database tables needed** — the Go backend runs its own migrations on startup and creates all tables automatically
- **Supabase is only used for auth** — it issues JWTs that the Go backend validates. All app data lives in the Supabase Postgres database, managed by our migrations
- **The `anon` key is safe to expose in the frontend** — it's designed to be public. Row-level security on the Supabase side is not needed since we don't use the Supabase client for data access
- **CORS_ORIGIN** should match the URL your users visit (e.g. `http://192.168.1.50:3000` or a domain if you set one up)
