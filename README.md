# Clinic Backend

A RESTful API for managing clinic operations — patients, doctors, appointments, and scheduling. Built with Node.js, Express, and Supabase.

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express 5
- **Database:** Supabase (PostgreSQL)
- **Auth:** JWT via httpOnly cookies
- **Password hashing:** bcrypt
- **Dev tooling:** nodemon

## Architecture

The project follows a layered architecture — each layer has a single responsibility:

```
routes → controllers → services → database
```

```
src/
├── controllers/   # HTTP layer — reads req, calls service, writes res
├── lib/           # Third-party client setup (Supabase)
├── middleware/    # Auth guards, error handling
├── routes/        # URL + method → controller mapping
├── services/      # Business logic + database queries
├── utils/         # Pure helpers (JWT signing, ApiError class)
└── validators/    # Request body validation (runs before controllers)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the clinic schema applied

### Installation

```bash
git clone https://github.com/Moha-Why/Clinic-Backend.git
cd Clinic-Backend
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

JWT_SECRET=your_jwt_secret
```

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

---

## API Reference

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login with email + password |
| POST | `/api/auth/logout` | Authenticated | Clear auth cookie |

**Login request body:**
```json
{
  "email": "admin@clinic.com",
  "password": "yourpassword"
}
```

**Login response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@clinic.com",
      "role": "admin",
      "fullName": "John Doe",
      "phone": "01012345678"
    }
  }
}
```

> The JWT is set as an `httpOnly` cookie (`accessToken`) and is not included in the response body.

---

### Doctors

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/doctors` | Public | Get all doctors |
| GET | `/api/doctors/:id` | Public | Get doctor by ID |
| POST | `/api/doctors` | Admin | Create a doctor + weekly availability |
| PUT | `/api/doctors/:id` | Admin | Update doctor info and/or availability |
| DELETE | `/api/doctors/:id` | Admin | Delete a doctor |

**Create doctor request body:**
```json
{
  "doctor": {
    "full_name": "Dr. Sarah Ahmed",
    "specialty": "Cardiology",
    "phone": "01098765432"
  },
  "availability": [
    { "day_of_week": 0, "start_time": "09:00", "end_time": "17:00" },
    { "day_of_week": 2, "start_time": "09:00", "end_time": "17:00" }
  ]
}
```

> When creating a doctor, availability slots are inserted into `doctor_weekly_availability` in the same operation. If availability insertion fails, the doctor row is deleted to keep the database consistent.

> When updating availability, the old schedule is snapshotted before deletion. If the new insert fails, the old rows are restored.

---

### Appointments

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/appointments` | Public | Book an appointment |
| GET | `/api/appointments` | Admin | Get all appointments |
| PUT | `/api/appointments/:id` | Admin | Update appointment details |
| PUT | `/api/appointments/:id/cancel` | Admin | Cancel an appointment |

**Book appointment request body:**
```json
{
  "patient": {
    "full_name": "Mohamed Ali",
    "phone": "01011112222",
    "date_of_birth": "1990-05-15"
  },
  "appointment": {
    "doctor_id": "uuid",
    "appointment_date": "2025-08-10",
    "appointment_time": "10:00",
    "notes": "Follow-up visit"
  }
}
```

> Patients are upserted by phone number — if a patient with the same phone already exists, their record is updated rather than creating a duplicate.

**Cancel appointment request body:**
```json
{
  "cancellation_reason": "Patient requested reschedule"
}
```

> Cancellation sets `status = 'cancelled'`, records the `cancellation_reason`, and timestamps `cancelled_at`.

---

## Auth & Authorization

Authentication uses JWT stored in an `httpOnly` cookie, which prevents client-side JavaScript from accessing the token.

### Flow

1. Client sends credentials to `POST /api/auth/login`
2. Server validates credentials, signs a JWT (`userId` + `role`), and sets it as a cookie
3. Subsequent requests automatically include the cookie
4. `requireAuth` middleware verifies the token and re-fetches the user from the database on every request
5. `requireAdmin` middleware checks that the user's role is `admin`

### Why re-fetch the user on every request?

Trusting only the JWT payload means a deactivated account could still make requests until the token expires. Re-validating against the database ensures that `is_active = false` takes effect immediately.

### Middleware

```
requireAuth          → validates cookie token + fetches user from DB
requireAdmin         → shorthand for requireRole('admin')
requireRole(...roles) → middleware factory for any role combination
```

---

## Error Handling

All errors flow to a global error handler registered in `app.js`. Services throw `ApiError` instances with an HTTP status code attached:

```js
throw new ApiError(401, 'Invalid email or password');
```

The error handler reads `err.statusCode` and responds accordingly. In development mode, the stack trace is included in the response.

Unmatched routes return a `404` with the method and path that was attempted.

---

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | Admin/staff accounts with role-based access |
| `patients` | Patient records, upserted by phone |
| `doctors` | Doctor profiles |
| `doctor_weekly_availability` | Recurring weekly schedule per doctor |
| `appointments` | Appointment records linked to patient + doctor |

---

## Project Series

This backend is part of an **Idea to MVP** video series:

1. Project Planning
2. Database Schema Design
3. **Backend — Architecture & Auth** ← this repo
4. Backend — Doctors & Appointments
5. Frontend

---

## License

ISC
