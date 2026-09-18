# Clinic Backend

REST API for HealthCare Clinic: doctors, weekly hours, guest booking, and staff appointment management. Node.js, Express, and Supabase (PostgreSQL).

The public site and admin UI live in the sibling app **hc_clinic** (Next.js). That app is a BFF: the browser talks only to Next; Next’s server talks to this API. Do not put Supabase keys in the frontend.

```
Browser → hc_clinic (Next, :3000) → Clinic-Backend (Express, :4000) → Supabase Postgres
```

## Tech stack

- Node.js 18+ (ESM)
- Express 5
- Supabase Postgres (`SUPABASE_SERVICE_ROLE_KEY` only)
- JWT (`jsonwebtoken`) + bcrypt
- nodemon in development

```
src/
├── controllers/   HTTP: read req, call service, write res
├── lib/           Supabase client
├── middleware/    Auth guards, error handling
├── routes/        URL + method → controller
├── scripts/       seed.js
├── services/      Business logic + queries
├── utils/         JWT, clinic timezone, ApiError
└── validators/    Request body checks
```

## Database

Apply **`clinic_schema.sql` once** in the Supabase SQL editor on a new project. That file is the full schema (including appointment status `expired`). Do not re-run it on a database that already has these tables.

| Table | Role |
|---|---|
| `users` | Staff accounts (`admin` / `doctor` / `patient`). Login uses this table. |
| `doctors` | Doctor profile, slot length, `is_active` |
| `doctor_weekly_availability` | Working windows per ISO weekday |
| `patients` | Guest identity keyed by **phone** (`user_id` may be null) |
| `appointments` | Real `timestamptz` start/end, status, notes |

**Weekdays are ISO-8601: 1 = Monday … 7 = Sunday.** Do not use JavaScript `Date#getDay()` (0 = Sunday).

Closed days have **no availability row**. Do not insert dummy hours.

Appointment statuses:

| Status | Meaning |
|---|---|
| `booked` | Confirmed upcoming (or in-progress) visit |
| `expired` | Was `booked` and `appointment_end_at` is in the past (set on the next appointments or slots fetch) |
| `cancelled` | Staff cancelled while still upcoming |
| `completed` | Staff marked attended |
| `no_show` | Staff marked did not attend |

Booked slots cannot overlap for the same doctor (exclusion constraint + unique index on booked start).

## Local setup

```bash
npm install
```

`.env` (see `.env.example`):

```env
PORT=4000
NODE_ENV=development
CLINIC_TZ=Africa/Cairo

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret

SEED_ADMIN_EMAIL=admin@clinic.com
SEED_ADMIN_PASSWORD=choose-a-strong-admin-password
```

| Variable | Used for |
|---|---|
| `PORT` | Listen port. Hosts often inject this (e.g. 8080). Default 4000. |
| `CLINIC_TZ` | IANA zone for expanding weekly hours into dates (not UTC weekdays). |
| `SUPABASE_*` | Database. Service role only; never an anon key. |
| `JWT_SECRET` | Signs login tokens. |
| `SEED_ADMIN_*` | **`npm run seed` only.** Login does not read these. Safe to delete after the first seed. |

```bash
npm run seed   # once: admin user + one doctor, Mon–Thu 09:00–17:00
npm run dev    # nodemon, http://localhost:4000
npm start      # production
```

The process binds **`0.0.0.0`** so a reverse proxy (Fly, Railway, Docker) can reach it.

Pair with hc_clinic: `CLINIC_API_URL=http://localhost:4000` in that app’s `.env.local`, then `npm run dev` there on port 3000.

## HTTP

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Public | `{ "message": "Clinic API" }` |
| GET | `/health` | Public | `{ "ok": true }` — use this for host health checks |
| POST | `/api/auth/login` | Public | Email + password. Response includes `data.token`. Also sets an Express cookie (the Next BFF ignores it and sets its own). |
| POST | `/api/auth/logout` | Auth | |
| GET | `/api/auth/me` | Auth | Current user, no password hash |
| GET | `/api/doctors` | Public | All doctors + weekly hours. The Next booking form keeps `is_active` only. |
| GET | `/api/doctors/:id` | Public | One doctor or 404 |
| GET | `/api/doctors/:id/slots` | Public | `?from=YYYY-MM-DD&to=YYYY-MM-DD` (max 31 days). Uses `CLINIC_TZ`, duration, skips past and booked. |
| POST | `/api/doctors` | Admin | Doctor + at least one working-day window |
| PUT | `/api/doctors/:id` | Admin | Profile and/or replace availability |
| DELETE | `/api/doctors/:id` | Admin | Fails with 409 if appointments still reference them |
| POST | `/api/appointments` | Public | Guest book |
| GET | `/api/appointments` | Admin | Joins patient + doctor; expires stale `booked` rows first |
| PUT | `/api/appointments/:id/cancel` | Admin | Upcoming `booked` only; body `{ "cancellation_reason": "..." }` |
| PUT | `/api/appointments/:id/complete` | Admin | From `booked` or `expired` |
| PUT | `/api/appointments/:id/no-show` | Admin | From `booked` or `expired` |

There is **no** generic `PUT /api/appointments/:id`.

### Login

```json
{ "email": "admin@clinic.com", "password": "yourpassword" }
```

`data.token` is the JWT. hc_clinic stores it in a Next httpOnly cookie (`sameSite=lax`) and sends `Cookie: accessToken=...` on admin calls.

Auth middleware verifies the JWT **and reloads the user** so `is_active = false` takes effect before expiry.

### Book

```json
{
  "patient": { "full_name": "Mohamed Ali", "phone": "01011112222" },
  "appointment": {
    "doctor_id": "uuid",
    "appointment_start_at": "2026-09-21T07:00:00.000Z",
    "notes": "Follow-up visit"
  }
}
```

Do **not** send `appointment_end_at`. The server adds the doctor’s duration, checks weekly hours in `CLINIC_TZ`, and rejects overlap with **409**. Patients are upserted on phone.

## Errors

Services throw `ApiError(status, message)`. Unmatched routes are 404. In development the JSON may include a stack trace.

## Deploy

1. Schema already applied on the target Supabase project (`clinic_schema.sql` for a new DB).
2. Set secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `CLINIC_TZ`, `NODE_ENV=production`. Do not ship `SEED_ADMIN_*`.
3. Let the host set `PORT`. The proxy **internal port must equal `PORT`** (this app defaults to 4000 locally; many hosts use 8080 — set `PORT` to match).
4. Health check **`GET /health`**, not a random port.
5. Then point hc_clinic’s `CLINIC_API_URL` at this public origin (no trailing slash). No CORS is required for the Next BFF.

## Project series

Idea to MVP:

1. Project planning
2. Database schema
3. Backend — architecture and auth
4. Backend — doctors and appointments
5. Frontend (hc_clinic)

## License

ISC
