# Pulse — Check-in app

A private, single-user check-in tracker: set up team members on a weekly, fortnightly, or
monthly cadence, run their check-ins (wins / challenges / growth / action items), and review
outstanding action items each week. React + TypeScript frontend, Express + TypeScript + Prisma
backend, Postgres, all Dockerized. Sign-in is Google OAuth, restricted to your own account(s).

## Project layout

```
checkin-app/
  docker-compose.yml
  .env.example        <- copy to .env and fill in
  backend/            Express + TypeScript API, Prisma ORM
  frontend/            React + TypeScript app (Vite), served by nginx in Docker
```

## 1. Create a Google OAuth Client ID

You said your Google account uses ricado.co.nz Workspace SSO — this app uses **Google Sign-In**
(no separate password), and restricts access with an allowlist so only your account(s) can log in.

1. Go to the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials).
2. Create a project (any name), then **Create Credentials → OAuth client ID → Web application**.
3. Under **Authorized JavaScript origins**, add `http://localhost:5173` (and any other host/port
   you'll access the app from, e.g. `http://192.168.1.x:5173` if running on a home server).
4. Copy the generated **Client ID**.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

- `GOOGLE_CLIENT_ID` — the client ID from step 1.
- `ALLOWED_EMAILS` — comma-separate every Google account that should be able to sign in,
  including your exact work SSO address and personal Gmail if you use both.
- Leave `ALLOW_DOMAIN_ACCESS=false` for this single-user app. Setting it to `true` together
  with `ALLOWED_DOMAIN` deliberately grants every account in that domain access to the same data.
- `JWT_SECRET` — set to a long random string (e.g. `openssl rand -hex 32`).
- Leave the Postgres and CORS values as-is for local use, or adjust if needed.

Only explicitly listed emails can log in by default. Domain-wide access requires the separate
`ALLOW_DOMAIN_ACCESS=true` opt-in; everyone else gets a 403 even with a valid Google account.

## 3. Run it

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Postgres: localhost:5432 (user/password/db default to `checkin`, override in `.env`)

On first boot the backend runs `prisma migrate deploy` automatically against the Postgres
container, creating the schema. No manual migration step needed.

## How it works

- **Team members** — add people with a name, optional role/email, and a cadence (weekly /
  fortnightly / monthly). The app computes each person's next check-in due date from their last
  completed check-in (or their start date, if they've never had one).
- **Check-ins** — from the Dashboard or a team member's page, "Start check-in" opens a form for
  wins, challenges, growth notes, and action items. Any of that person's still-open action items
  from previous check-ins are pulled in automatically so you can mark them done, keep them in
  progress, or add new ones — nothing falls through the cracks.
- **Review** — a dedicated weekly view listing overdue action items, items due this week,
  undated items, upcoming items, and anyone whose next check-in falls this week. You can mark
  items done, in progress, or explicitly carry them into the next check-in from this screen.

## Local development (without Docker)

Run ESLint across both applications from the repository root:

```bash
npm run lint
```

To apply safe automatic fixes:

```bash
npm run lint:fix
```

Backend:
```bash
cd backend
cp .env.example .env   # point DATABASE_URL at a local Postgres
npm install
npm run prisma:migrate:dev
npm run dev             # http://localhost:4000
```

Frontend:
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## Notes / things to extend later

- This is scoped for one user (you) reviewing your own team — there's no multi-user permission
  model beyond the login allowlist.
- Deleting a team member cascades and deletes their check-ins and action items — there's a
  confirmation prompt in the UI, but there's no undo.
- The Dockerfiles were verified to build (`tsc` type-checks clean on both frontend and backend);
  full `docker compose up` wasn't run in this environment, so do a first `docker compose up
  --build` and check logs before relying on it.
