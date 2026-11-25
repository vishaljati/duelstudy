<div align="center">

# 📚 DuelStudy

**A study planner and accountability platform where you compete with friends, not with distractions.**

Plan your day, log your practice, build streaks, and go head-to-head in a daily **Duel**.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Authentication Flow](#authentication-flow)
- [Daily Duel Engine](#daily-duel-engine)
- [Gamification](#gamification)
- [Testing](#testing)
- [Scripts](#scripts)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

---

## Overview

Studying alone is easy to postpone. **DualStudy** turns it into something social and measurable.

Each user picks a goal at signup, either **NEET** or **CSE**. The app then tailors the question tracker to that goal: Physics/Chemistry/Biology counts for NEET aspirants, and LeetCode/Web Development counts for CSE students. You plan tasks, follow a weekly timetable, log daily practice, and watch your streak grow. Add friends, compare your progress against theirs, and see who wins the day.

---

## Features

| Area | What you get |
|---|---|
| 🔐 **Authentication** | Register / login with JWT access and refresh tokens, silent token refresh, change password, profile update |
| ✅ **Study Planner** | Create, edit, prioritise (low / medium / high), schedule and complete tasks with durations; weekly target and progress |
| 🧮 **Question Tracker** | Goal-specific daily logs (NEET: Physics, Chemistry, Biology; CSE: LeetCode, Web Dev) with daily and weekly summaries |
| 🗓️ **Timetable** | Weekly time-slot schedule (study, sleep, meals, wellness, breaks) with a sensible default and one-click reset |
| 🔥 **Activity & Streaks** | Study-minute logging, activity calendar, and current/longest streak tracking |
| 🤝 **Friends** | Search users, send / accept / reject / cancel requests, remove friends, invite codes |
| ⚔️ **Daily Duel** | Head-to-head comparison with a friend, with end-of-day snapshots that are finalized automatically |
| 🏆 **Competition** | Friends-only weekly leaderboard, study challenges you can create and join, achievement badges |
| 🎖️ **Rewards** | XP, levels and unlockable badges |
| 📊 **Dashboard** | Today's checklist, up-next tasks, weekly chart, subject counts, activity feed and stats overview |

---

## Tech Stack

**Frontend**

- React 19 with React Router
- Vite for dev server and builds
- Tailwind CSS 4
- Axios with a refresh-token interceptor
- Lucide React icons

**Backend**

- Node.js (ES modules) and Express 5
- MongoDB with Mongoose
- JWT (`jsonwebtoken`) and `bcrypt` for password hashing
- `node-cron` for scheduled Daily Duel finalization
- `cookie-parser`, `cors`, `dotenv`
- Node's built-in test runner

---

## Architecture

```
┌──────────────────────┐        HTTPS / JSON         ┌───────────────────────────┐
│  React SPA (Vite)    │  ───────────────────────▶   │  Express REST API         │
│  • AuthContext       │   Cookie or Bearer token    │  • verifyJWT middleware   │
│  • DataContext       │  ◀───────────────────────   │  • Controllers / Services │
│  • Axios interceptor │       401 → auto refresh    │  • Central error handler  │
└──────────────────────┘                             └─────────────┬─────────────┘
                                                                   │ Mongoose
                                                     ┌─────────────▼─────────────┐
                                                     │  MongoDB                  │
                                                     │  + node-cron daily job    │
                                                     └───────────────────────────┘
```

Key design decisions:

- **Stateless API auth.** Short-lived access tokens are accepted from an `accessToken` cookie or an `Authorization: Bearer` header. A refresh token is stored on the user document and used to mint new access tokens.
- **Silent refresh on the client.** The Axios response interceptor catches `401`s, refreshes once (deduplicated across concurrent requests), and retries the original request. If refresh fails, the user is redirected to `/login`.
- **IST-aware date logic.** Daily boundaries, streaks and weekly ranges are computed in `Asia/Kolkata`, independent of the server's timezone.
- **Idempotent snapshots.** Daily Duel results are written with insert-only upserts, so re-running the job never overwrites history.
- **Uniform API contract.** Every response uses the shared `ApiResponse` / `ApiError` shapes, handled by a central error middleware.

---

## Project Structure

```
dualstudy/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers (user, planner, friends, ...)
│   │   ├── routes/          # Express routers, one per feature
│   │   ├── models/          # Mongoose schemas
│   │   ├── services/        # Business logic (rewards)
│   │   ├── jobs/            # node-cron jobs (Daily Duel)
│   │   ├── middlewares/     # verifyJWT, error handler
│   │   ├── utils/           # ApiError, ApiResponse, asyncHandler, helpers
│   │   ├── db/              # MongoDB connection
│   │   ├── app.js           # Express app, CORS, routes
│   │   └── index.js         # Entry point: DB, job recovery, server start
│   ├── tests/               # API and integration tests
│   └── API_TEST_REPORT.md   # Endpoint inventory and test findings
└── frontend/
    └── src/
        ├── api/             # Axios instance and endpoint map
        ├── components/      # auth, dashboard, planner, layout, ui
        ├── context/         # AuthContext, DataContext
        ├── lib/             # constants, dates, stats, rewards, helpers
        └── pages/           # Landing, Login, Signup, Dashboard, Planner,
                             # Questions, Timetable, Friends, Competition,
                             # Rewards, Profile
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or newer
- **MongoDB**, either a local instance or a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **npm** (backend) and **pnpm** or **npm** (frontend)

### 1. Clone the repository

```bash
git clone https://github.com/vishaljati/dualstudy.git
cd dualstudy
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (see [Environment Variables](#environment-variables)), then start the server:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Verify it with:

```bash
curl http://localhost:5000/health
```

### 3. Set up the frontend

```bash
cd ../frontend
pnpm install        # or: npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the dev server:

```bash
pnpm dev            # or: npm run dev
```

The app runs at `http://localhost:3000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API port | `5000` |
| `CLIENT_URL` | Allowed CORS origin (the frontend URL) | `http://localhost:3000` |
| `MONGODB_URL` | MongoDB connection string (database name `DuelStudy` is appended by the app) | `mongodb://127.0.0.1:27017` |
| `ACCESS_TOKEN_SECRET` | Secret used to sign access tokens | long random string |
| `ACCESS_TOKEN_EXPIRY` | Access token lifetime | `10d` |
| `REFRESH_TOKEN_SECRET` | Secret used to sign refresh tokens | different long random string |
| `REFRESH_TOKEN_EXPIRY` | Refresh token lifetime | `30d` |
| `DAILY_DUEL_START_DATE` | First date eligible for Daily Duel, `YYYY-MM-DD`. **Required**: the server will not start without a valid value | `2026-01-01` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `/api` |

> ⚠️ **Never commit `.env` files.** Generate strong secrets, for example with `openssl rand -hex 64`, and use different values per environment.

---

## API Reference

All routes are prefixed with `/api`. Everything except register, login and refresh requires authentication.

<details>
<summary><strong>Users</strong> · <code>/api/users</code></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | – | Create an account |
| POST | `/login` | – | Log in and receive tokens |
| POST | `/refresh-token` | – | Issue a new access token |
| POST | `/logout` | ✔ | Log out and invalidate the refresh token |
| POST | `/change-password` | ✔ | Change the current password |
| GET | `/me` | ✔ | Get the current user |
| PATCH | `/update-account` | ✔ | Update account details |

</details>

<details>
<summary><strong>Planner</strong> · <code>/api/planner</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | List tasks (supports filters) |
| POST | `/tasks` | Create a task |
| GET | `/tasks/:id` | Get a task |
| PATCH | `/tasks/:id` | Update a task |
| PATCH | `/tasks/:id/status` | Mark planned / completed |
| DELETE | `/tasks/:id` | Delete a task |
| GET | `/weekly-progress` | Weekly progress against target |
| PATCH | `/weekly-target` | Update weekly target hours |

</details>

<details>
<summary><strong>Question Tracker</strong> · <code>/api/questions</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET | `/config` | Goal-specific tracker configuration |
| GET | `/daily-summary` | Summary for a day |
| GET | `/weekly-summary` | Summary for a week |
| POST | `/logs` | Create or update a daily log |
| GET | `/logs` | List logs (date range supported) |
| GET | `/logs/:id` | Get a log |
| DELETE | `/logs/:id` | Delete a log |

</details>

<details>
<summary><strong>Timetable</strong> · <code>/api/timetable</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get the weekly timetable |
| POST | `/` | Create a slot |
| GET | `/:id` | Get a slot |
| PATCH | `/:id` | Update a slot |
| DELETE | `/:id` | Delete a slot |
| DELETE | `/reset` | Reset the entire timetable |

</details>

<details>
<summary><strong>Activity</strong> · <code>/api/activity</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| POST | `/log` | Log study minutes / sessions |
| GET | `/today` | Today's activity |
| GET | `/calendar` | Activity calendar |
| GET | `/streak` | Current and longest streak |

</details>

<details>
<summary><strong>Friends</strong> · <code>/api/friends</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List friends |
| GET | `/search` | Search users |
| POST | `/invite` | Send a friend request |
| GET | `/requests/incoming` | Incoming requests |
| GET | `/requests/outgoing` | Outgoing requests |
| PATCH | `/requests/:id/accept` | Accept a request |
| PATCH | `/requests/:id/reject` | Reject a request |
| DELETE | `/requests/:id` | Cancel a request |
| DELETE | `/:friendId` | Remove a friend |
| GET | `/:friendId/compare` | Compare progress with a friend |
| GET | `/:friendId/daily-duel` | Daily Duel result against a friend |

</details>

<details>
<summary><strong>Competition</strong> · <code>/api/competition</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET | `/leaderboard/weekly` | Friends-only weekly leaderboard |
| GET | `/badges` | Badges and your progress toward them |
| POST | `/challenges` | Create a challenge |
| GET | `/challenges` | List challenges |
| GET | `/challenges/:id` | Get a challenge |
| POST | `/challenges/:id/join` | Join a challenge |

</details>

<details>
<summary><strong>Rewards</strong> · <code>/api/rewards</code></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Unlocked rewards |
| GET | `/progress` | XP, level and reward progress |

</details>

**Utility:** `GET /health` returns service status and a timestamp.

---

## Authentication Flow

1. **Login** returns an access token and a refresh token (also set as cookies, with credentials enabled for CORS).
2. Protected requests send the access token via cookie or `Authorization: Bearer <token>`.
3. On `401`, the client calls `POST /api/users/refresh-token` **once**, then retries the failed request.
4. If the refresh fails, the user is sent to `/login`.
5. **Logout** clears the stored refresh token.

Passwords are hashed with `bcrypt` and are never returned by the API.

---

## Daily Duel Engine

The Daily Duel compares two friends' performance for a given day (study minutes, tasks completed, completion rate).

- A **cron job runs every day at 12:05 AM IST** and finalizes the previous day into a permanent snapshot.
- On server start, a **recovery routine** finalizes any days missed while the server was down, starting from `DAILY_DUEL_START_DATE`.
- Snapshots are **insert-only**: finalizing the same day twice is safe and never overwrites existing results.
- Today's and future dates can never be finalized.

---

## Gamification

- **XP:** tasks and logged questions earn XP, and levels advance in fixed XP steps.
- **Badges:** milestones such as your first session, 10 / 50 / 100 total study hours, 7- and 30-day streaks, and 30 active days.
- **Weekly leaderboard:** you and your accepted friends are ranked by weekly points, then study minutes, then active days.
- **Challenges:** friends can create time-boxed challenges based on study minutes or active days, with a target to hit.

---

## Testing

```bash
cd backend
npm test
```

The suite uses Node's built-in test runner and covers public auth validation, unauthenticated access to protected routes, and the error handler. Integration workflows that exercise authenticated, database-backed behaviour need an **isolated test MongoDB instance**; see [`backend/API_TEST_REPORT.md`](backend/API_TEST_REPORT.md) for the endpoint inventory and current coverage.

---

## Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon and `.env` loading |
| `npm start` | Start in production mode |
| `npm test` | Run the test suite |

### Frontend

| Command | Description |
|---|---|
| `pnpm dev` | Start the Vite dev server on port 3000 |
| `pnpm build` | Create a production build in `dist/` |
| `pnpm start` | Preview the production build |

---

## Roadmap

- [ ] Full authenticated integration test coverage against an isolated test database
- [ ] Rate limiting and request validation hardening
- [ ] Real-time duel updates
- [ ] Email notifications for friend requests and challenges
- [ ] Docker Compose setup for one-command local development
- [ ] CI pipeline (lint, test, build)

---

## Contributing

Contributions, issues and feature requests are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push the branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please run Prettier before committing backend changes.

---

## Author

**Vishal Jati**
GitHub: [@vishaljati](https://github.com/vishaljati)

---

## License

Distributed under the **ISC License**. Add a `LICENSE` file to the repository root to make this explicit.

<div align="center">

⭐ If DualStudy helps you study harder, consider giving the repo a star.

</div>
