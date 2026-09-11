# CalorieTrack

A full-stack calorie and macro tracking app, split into a separate frontend
and backend. Users onboard with their stats (auto-calculating BMR/TDEE via
the Mifflin-St Jeor equation), get a daily calorie + macro goal, then log
meals against it by searching a food database (seeded with common dishes,
including regional ones like samosa, biryani, dal, etc.) or creating their
own custom foods.

## Structure

```
caloriess/
├── backend/    Express + TypeScript + Prisma API server (port 4000)
└── frontend/   Next.js (App Router) + TypeScript + Tailwind client (port 3000)
```

The two are fully decoupled — the frontend only talks to the backend over
HTTP (`NEXT_PUBLIC_API_URL`), with no server-side database access of its
own. This also means a future mobile client (React Native/Capacitor, for a
Play Store release) can reuse the same backend API as-is.

## Stack

- **Backend**: Express, Prisma ORM + PostgreSQL, JWT auth stored in an
  httpOnly cookie, Zod for validation
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS, no
  server-side data fetching — pages call the backend client-side via
  `src/lib/api.ts`

## Getting started

**Backend** (needs a local Postgres — e.g. `brew install postgresql@17 && brew services start postgresql@17 && createdb caloriess`):
```bash
cd backend
npm install
# set DATABASE_URL in .env, e.g.
#   postgresql://<your-macos-username>@localhost:5432/caloriess?schema=public
npx prisma migrate dev   # applies the schema
npx tsx prisma/seed.ts   # seeds ~30 common foods (Indian + Western)
npm run dev              # http://localhost:4000
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
```

Open http://localhost:3000, sign up, complete onboarding, and start logging.

## Project structure

- `backend/prisma/schema.prisma` — data model (User, FoodItem, LogEntry, WeightLog)
- `backend/prisma/seed.ts` — starter food dataset
- `backend/src/lib/calculations.ts` — BMR/TDEE/macro-goal math (pure functions)
- `backend/src/lib/jwt.ts`, `src/middleware/require-auth.ts` — cookie-based JWT auth
- `backend/src/routes/*` — auth, profile, food-items, log-entries endpoints
- `frontend/src/lib/api.ts` — typed fetch wrapper (adds `credentials: "include"`
  so the auth cookie is sent cross-origin)
- `frontend/src/lib/calculations.ts` — same pure math, duplicated for the live
  onboarding preview (no backend round-trip needed while typing)
- `frontend/src/app/{login,signup,onboarding,dashboard}` — pages
- `frontend/src/components/dashboard/` — dashboard UI + add-food modal

## Notes / next steps

- Food search currently hits only the local (seeded + user-created) database.
  To broaden coverage further, wire in an external food API (Edamam or
  Nutritionix) in `backend/src/routes/food-items.ts` and cache first-time
  results into `FoodItem`.
- `LogEntry` snapshots calories/macros at the time of logging, so editing a
  `FoodItem` later won't retroactively change historical logs.

## Deploying to Render

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that provisions everything: a Postgres database plus the backend and
frontend as two separate web services.

1. Push this repo to GitHub (Render deploys from a connected repo).
2. In the Render dashboard: **New → Blueprint**, pick this repo. Render
   reads `render.yaml` and creates `caloriess-db`, `caloriess-backend`, and
   `caloriess-frontend`.
3. Render will prompt for the env vars marked `sync: false` in `render.yaml`:
   `GEMINI_API_KEY`, `TAVILY_API_KEY`, `SERPAPI_API_KEY` (same values as your
   local `backend/.env`) — `DATABASE_URL` and `JWT_SECRET` are generated
   automatically.
4. Once both services have deployed once and you can see their public URLs
   (`https://caloriess-backend-xxxx.onrender.com` and
   `https://caloriess-frontend-xxxx.onrender.com`), set the two remaining
   env vars by hand (Render Blueprints can't auto-fill a public URL between
   services) and let them redeploy:
   - On `caloriess-backend`: `FRONTEND_URL` = the frontend's URL
   - On `caloriess-frontend`: `NEXT_PUBLIC_API_URL` = the backend's URL

Notes specific to this deploy topology:
- The backend's CORS in `src/index.ts` is wide-open to any `localhost:*`
  origin in dev, but strictly locked to `FRONTEND_URL` when
  `NODE_ENV=production` (set by the Blueprint).
- The auth cookie's `sameSite` is `"none"` in production — required because
  the two services live on different `*.onrender.com` subdomains (a
  cross-site context for cookies), not just different ports like in dev.
- Render's free Postgres tier is time-limited; check current terms in the
  dashboard when you provision it, and upgrade the database plan before it
  expires if you want to keep the deployment long-term.
