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

- **Backend**: Express, Prisma ORM + SQLite (swap `DATABASE_URL`/the
  `provider` in `schema.prisma` for Postgres to move to production — see
  notes below), JWT auth stored in an httpOnly cookie, Zod for validation
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS, no
  server-side data fetching — pages call the backend client-side via
  `src/lib/api.ts`

## Getting started

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev   # creates the SQLite db + applies the schema
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
- **Before deploying**: replace both `JWT_SECRET` (backend `.env`) and
  switch `provider = "sqlite"` to `"postgresql"` in `schema.prisma` with a
  hosted Postgres `DATABASE_URL` (e.g. Neon/Supabase) — SQLite's local file
  won't survive on serverless hosts. Set the cookie's `sameSite`/`secure`
  options in `backend/src/routes/auth.ts` for your production domain setup,
  and point the frontend's `NEXT_PUBLIC_API_URL` at the deployed backend URL.
