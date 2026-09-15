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
that provisions a Postgres database plus **one** web service, `caloriess`,
serving both apps from the same origin.

1. Push this repo to GitHub (Render deploys from a connected repo).
2. In the Render dashboard: **New → Blueprint**, pick this repo. Render
   reads `render.yaml` and creates `caloriess-db` and `caloriess`.
3. Render will prompt for the env vars marked `sync: false` in `render.yaml`:
   `GEMINI_API_KEY`, `TAVILY_API_KEY`, `SERPAPI_API_KEY` (same values as your
   local `backend/.env`) — `DATABASE_URL` and `JWT_SECRET` are generated
   automatically.
4. Deploy and open the service's URL — no other setup needed. There's no
   `FRONTEND_URL`/`NEXT_PUBLIC_API_URL` cross-referencing step, because
   there's only one service and one URL.

Why one service instead of a frontend + backend split:
- The build (see the `buildCommand` in `render.yaml`) builds the frontend as
  a static export (`next.config.ts` sets `output: "export"`, since the app
  has no SSR, middleware, or route handlers), then copies it into
  `backend/public`. The backend (`src/index.ts`) serves those files directly
  alongside its `/api/*` routes.
- This makes the frontend and backend **same-origin** in production, so the
  auth cookie is first-party. A split-service topology (frontend and
  backend on two different `*.onrender.com` subdomains) requires a
  cross-site cookie (`sameSite: "none"`), which Safari's Intelligent
  Tracking Prevention blocks by default in every browsing mode (not just
  Private Browsing), and which Chrome is also increasingly blocking by
  default for a growing share of users as it phases out third-party
  cookies. Same-origin sidesteps this entirely — the cookie is `sameSite:
  "lax"` (see `src/routes/auth.ts`) and works everywhere.
- The trade-off: this is a single free **Web Service** (spins down after
  inactivity, ~30-60s cold start on the next request), rather than a free
  **Static Site** (no spin-down) for the frontend half. Given the choice is
  between an occasional cold start vs. login not working at all in Safari,
  same-origin wins.
- Render's free Postgres tier is time-limited; check current terms in the
  dashboard when you provision it, and upgrade the database plan before it
  expires if you want to keep the deployment long-term.
