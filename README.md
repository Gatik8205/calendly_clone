# Calendly Clone

A full-stack scheduling/booking web application replicating Calendly's core UX. Built as part of an SDE Intern Fullstack Assignment.

**Live Demo:** https://calendly-clone-seven-smoky.vercel.app/ *(deploy URL after deployment)*  
**GitHub:** https://github.com/Gatik8205/calendly_clone

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router v6 |
| Styling | Tailwind CSS v3 |
| Backend | Node.js + Express.js |
| ORM | Prisma (PostgreSQL adapter) |
| Database | PostgreSQL |
| HTTP Client | Axios |
| Date/Time | Day.js |

---

## Features Implemented

### Core (All Required)
- ✅ **Event Types** — Create, edit, delete, toggle active/inactive; auto-slug generation; color picker; booking link copying
- ✅ **Availability Settings** — Per-day on/off toggles; start/end time pickers (30-min increments); timezone selection; default Mon–Fri preset
- ✅ **Public Booking Page** — Month calendar with available-date highlighting; time slot grid; double-booking prevention; invitee form (name + email + notes)
- ✅ **Booking Confirmation** — Summary card with full meeting details and booking reference ID
- ✅ **Meetings Page** — Upcoming / Past / Cancelled tabs; grouped-by-date view; cancel with confirmation dialog

### Bonus
- ✅ Responsive design (mobile-first, sidebar collapses on mobile)
- ✅ Multiple event types with unique slugs
- ✅ Optional notes field on booking form
- ✅ Seed data with 4 event types + 7 sample bookings

---

## Database Schema

```
AvailabilitySchedule (1) ──── (N) AvailabilityDay
                                         
EventType (1) ─────────────── (N) Booking
```

### `EventType`
| Column | Type | Notes |
|---|---|---|
| id | cuid | Primary key |
| name | String | Display name |
| slug | String | Unique URL identifier |
| duration | Int | Minutes (5–480) |
| description | String? | Optional |
| color | String | Hex accent color |
| location | String? | Zoom/Meet link or venue |
| isActive | Boolean | Soft disable |

### `AvailabilitySchedule`
| Column | Type | Notes |
|---|---|---|
| id | cuid | Primary key |
| name | String | e.g. "Working Hours" |
| timezone | String | IANA timezone |
| isDefault | Boolean | Active schedule |

### `AvailabilityDay`
| Column | Type | Notes |
|---|---|---|
| id | cuid | PK |
| dayOfWeek | Int | 0=Sun, 6=Sat |
| startTime | String | "HH:MM" 24-hr |
| endTime | String | "HH:MM" 24-hr |
| isActive | Boolean | Day enabled |
| scheduleId | FK | → AvailabilitySchedule |

### `Booking`
| Column | Type | Notes |
|---|---|---|
| id | cuid | Primary key |
| eventTypeId | FK | → EventType |
| inviteeName | String | |
| inviteeEmail | String | |
| startTime | DateTime | UTC |
| endTime | DateTime | UTC |
| status | Enum | confirmed / cancelled |
| notes | String? | Optional invitee message |
| cancelReason | String? | Set on cancellation |

---

## Slot Generation Algorithm

Slots are generated on-demand per `/api/public/slots/:slug?date=YYYY-MM-DD`:

1. Resolve the requested date's **day of week** in the host's timezone
2. Look up `AvailabilityDay` for that weekday — return empty if inactive
3. Build candidate slots: iterate from `startTime` → `endTime` in steps of `duration` minutes
4. Filter out any slot that **overlaps** with an existing `confirmed` booking for that event type (prevents double booking)
5. Filter out **past** slots (current time + 30 min buffer)
6. Return ISO 8601 UTC start/end times for each slot

---

## Project Structure

```
calendly-clone/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma       # DB schema
│   │   └── seed.js             # Sample data seeder
│   ├── routes/
│   │   ├── eventTypes.js       # Admin CRUD
│   │   ├── availability.js     # Schedule settings
│   │   ├── bookings.js         # Admin meetings view
│   │   └── public.js           # Invitee-facing endpoints
│   ├── middleware/
│   │   └── errorHandler.js     # Centralized error handling
│   └── index.js                # Express entry point
│
└── client/
    └── src/
        ├── api/index.js        # Axios API wrappers
        ├── components/
        │   ├── layout/Layout.jsx   # Sidebar + shell
        │   └── ui/index.jsx        # Modal, Button, Input, Toast, etc.
        └── pages/
            ├── EventTypes.jsx      # Admin: event types
            ├── Availability.jsx    # Admin: weekly hours
            ├── Meetings.jsx        # Admin: meeting list
            ├── BookingPage.jsx     # Public: calendar + slots + form
            └── BookingConfirmation.jsx
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- npm

### 1. Clone and install

```bash
git clone https://github.com/your-username/schedulr.git
cd calendly
npm install          # installs concurrently
npm run install:all  # installs server + client deps
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/schedulr"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

### 3. Set up the database

```bash
# Create DB, run migrations, and generate Prisma client
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Start development servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Prisma Studio: `npm run db:studio --prefix server`

---

## API Endpoints

### Admin (no auth — default user assumed)
| Method | Path | Description |
|---|---|---|
| GET | /api/event-types | List all event types |
| POST | /api/event-types | Create event type |
| PUT | /api/event-types/:id | Update event type |
| PATCH | /api/event-types/:id/toggle | Toggle active/inactive |
| DELETE | /api/event-types/:id | Delete event type |
| GET | /api/availability | Get schedule + days |
| PUT | /api/availability | Update schedule |
| GET | /api/bookings?view=upcoming\|past | List bookings |
| PATCH | /api/bookings/:id/cancel | Cancel a booking |

### Public (no auth)
| Method | Path | Description |
|---|---|---|
| GET | /api/public/event-types/:slug | Get event type by slug |
| GET | /api/public/available-dates/:slug?month=YYYY-MM | Dates with open slots |
| GET | /api/public/slots/:slug?date=YYYY-MM-DD | Available time slots |
| POST | /api/public/book | Create a booking |
| GET | /api/public/bookings/:id | Booking details |

---

## Assumptions

1. **Single admin user** — no authentication implemented per spec
2. **Single availability schedule** — "Working Hours" is the default; multi-schedule infrastructure is in schema but not exposed in UI
3. **Host timezone** — stored in `AvailabilitySchedule.timezone`; slot times are computed and displayed in this timezone
4. **Double-booking** — prevented at both the API level (database query) and UI level (slots are re-fetched before booking)
5. **Slug uniqueness** — auto-generated from event name; numeric suffix appended if collision detected
6. **Cancellation** — bookings can only be cancelled, not rescheduled (rescheduling is a bonus stretch goal)

---

## Deployment

### Backend (Render / Railway)
1. Create a PostgreSQL database service
2. Create a Web Service with build command `npm install && npx prisma migrate deploy && node prisma/seed.js` and start `node index.js`
3. Set env vars: `DATABASE_URL`, `NODE_ENV=production`, `CLIENT_URL`

### Frontend (Vercel / Netlify)
1. Set root to `client/`, build command `npm run build`, output dir `dist`
2. Set env var `VITE_API_URL` if not using Vite proxy
3. Add `_redirects` (Netlify) or `vercel.json` rewrite for SPA routing

---

*Built by Gatik Yadav — Jaypee University of Engineering and Technology*
