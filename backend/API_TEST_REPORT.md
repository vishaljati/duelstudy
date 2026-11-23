# API Test Report

## Execution summary

- Endpoint inventory: **47 endpoints** across seven routers.
- Initial pre-fix run: **43 requests**, 1 passed and 42 failed. All 40 protected-route probes returned 500; login and refresh missing-input probes also returned 500.
- Post-fix run before this task: **47 tests passed, 0 failed, 0 skipped**. Current run: **51 passed, 0 failed, 7 skipped** (the seven authenticated integration workflows are blocked). The current run includes 44 protected-route unauthenticated probes, three public auth validation probes, and error-handler checks.
- Full successful-request and database workflow testing for all **47 endpoints remains BLOCKED**: no dedicated test MongoDB URI or local `mongod` is available in this environment. No project `.env` values or existing database were used. Tests needing valid authenticated identities, writes, ownership checks, aggregation, or cleanup could not safely execute.
- Authentication implementation is local JWT + MongoDB user lookup. Clerk is not wired into this project.

## Findings

Before the fix, all 40 unauthenticated probes to protected routes returned **500** instead of **401** because `ApiError.statuscode` was not mapped to the HTTP response. After the fix, all 40 return **401** with the shared JSON error shape.

Public auth behavior follows the controllers: missing registration fields returns **400**, missing login email returns **400**, and missing refresh token returns **401**. All three now match those expected statuses.

## Endpoint inventory and request outcomes

â€œBLOCKEDâ€ means the route was inspected but no authenticated/database request was executed because an isolated test database and test credentials were unavailable. Expected statuses are based on controller behavior.

| Feature | Method and path | Auth | Expected status | Actual | Result / test coverage |
|---|---|---:|---:|---:|---|
| User | POST `/api/users/register` | No | 200 success; 400 invalid | 400 missing fields | BLOCKED; missing-field probe returned 400, success/duplicate untested |
| User | POST `/api/users/login` | No | 200 success; 400 missing; 401 bad password; 404 unknown user | 400 missing email | BLOCKED |
| User | POST `/api/users/refresh-token` | No | 200 success; 401 invalid/missing | 401 missing token | BLOCKED |
| User | POST `/api/users/logout` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| User | POST `/api/users/change-password` | Yes | 200; 400 invalid old/equal password; 401 missing | 401 unauthenticated | BLOCKED |
| User | GET `/api/users/me` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| User | PATCH `/api/users/update-account` | Yes | 200; 401 missing name | 401 unauthenticated | BLOCKED |
| Study Planner | GET `/api/planner/weekly-progress` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Study Planner | PATCH `/api/planner/weekly-target` | Yes | 200; 400 invalid range | 401 unauthenticated | BLOCKED |
| Study Planner | POST `/api/planner/tasks` | Yes | 201; 400 invalid/missing fields | 401 unauthenticated | BLOCKED |
| Study Planner | GET `/api/planner/tasks` | Yes | 200; 400 invalid filters | 401 unauthenticated | BLOCKED |
| Study Planner | GET `/api/planner/tasks/:id` | Yes | 200; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Study Planner | PATCH `/api/planner/tasks/:id` | Yes | 200; 400 invalid; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Study Planner | PATCH `/api/planner/tasks/:id/status` | Yes | 200; 400 invalid; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Study Planner | DELETE `/api/planner/tasks/:id` | Yes | 200; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Question Tracker | GET `/api/questions/config` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Question Tracker | GET `/api/questions/daily-summary` | Yes | 200; 400 invalid date | 401 unauthenticated | BLOCKED |
| Question Tracker | GET `/api/questions/weekly-summary` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Question Tracker | POST `/api/questions/logs` | Yes | 200; 400 invalid/missing/goal metrics | 401 unauthenticated | BLOCKED |
| Question Tracker | GET `/api/questions/logs` | Yes | 200; 400 invalid date/range | 401 unauthenticated | BLOCKED |
| Question Tracker | GET `/api/questions/logs/:id` | Yes | 200; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Question Tracker | DELETE `/api/questions/logs/:id` | Yes | 200; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Timetable | DELETE `/api/timetable/reset` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Timetable | POST `/api/timetable/` | Yes | 201; 400 invalid; 409 overlap | 401 unauthenticated | BLOCKED |
| Timetable | GET `/api/timetable/` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Timetable | GET `/api/timetable/:id` | Yes | 200; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Timetable | PATCH `/api/timetable/:id` | Yes | 200; 400 invalid; 409 overlap; 404 missing | 401 unauthenticated | BLOCKED |
| Timetable | DELETE `/api/timetable/:id` | Yes | 200; 404 missing/other owner | 401 unauthenticated | BLOCKED |
| Activity Tracker | POST `/api/activity/log` | Yes | 200; 400 invalid/future date/minutes | 401 unauthenticated | BLOCKED |
| Activity Tracker | GET `/api/activity/today` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Activity Tracker | GET `/api/activity/calendar` | Yes | 200; 400 invalid year/month | 401 unauthenticated | BLOCKED |
| Activity Tracker | GET `/api/activity/streak` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Friends and Invitations | POST `/api/friends/invite` | Yes | 201 new; 200 reciprocal; 400 self; 404 code; 409 duplicate | 401 unauthenticated | BLOCKED |
| Friends and Invitations | GET `/api/friends/requests/incoming` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Friends and Invitations | GET `/api/friends/requests/outgoing` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Friends and Invitations | PATCH `/api/friends/requests/:id/accept` | Yes | 200; 400 invalid ID; 404 unavailable | 401 unauthenticated | BLOCKED |
| Friends and Invitations | PATCH `/api/friends/requests/:id/reject` | Yes | 200; 400 invalid ID; 404 unavailable | 401 unauthenticated | BLOCKED |
| Friends and Invitations | DELETE `/api/friends/requests/:id` | Yes | 200; 404 unavailable | 401 unauthenticated | BLOCKED |
| Friends and Invitations | GET `/api/friends/` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Friends and Invitations | DELETE `/api/friends/:friendId` | Yes | 200; 400 invalid ID; 404 unavailable | 401 unauthenticated | BLOCKED |
| Friends and Invitations | GET `/api/friends/:friendId/compare` | Yes | 200; 400 invalid/self; 403 not friends; 404 absent | 401 unauthenticated | BLOCKED |
| Leaderboard, Challenges, and Achievements | GET `/api/competition/leaderboard/weekly` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Leaderboard, Challenges, and Achievements | GET `/api/competition/badges` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Leaderboard, Challenges, and Achievements | POST `/api/competition/challenges` | Yes | 201; 400 invalid fields/date | 401 unauthenticated | BLOCKED |
| Leaderboard, Challenges, and Achievements | GET `/api/competition/challenges` | Yes | 200; 401 unauthenticated | 401 unauthenticated | BLOCKED |
| Leaderboard, Challenges, and Achievements | GET `/api/competition/challenges/:id` | Yes | 200; 400 invalid ID; 403 private; 404 absent | 401 unauthenticated | BLOCKED |
| Leaderboard, Challenges, and Achievements | POST `/api/competition/challenges/:id/join` | Yes | 200; 400 invalid/ended; 403 not friend; 404 absent; 409 duplicate | 401 unauthenticated | BLOCKED |

## Source audit notes

- `app.js` mounts all seven route modules and their declared imports resolve. Specific routes precede parameter routes in the inspected routers; no route-order conflict was found.
- User auth is implemented with JWT access/refresh tokens, cookies or a bearer access token, and database user lookup in `verifyJWT`. There is no Clerk integration.
- Centralized `errorHandler` maps `ApiError.statuscode`, Mongoose validation errors, and unexpected failures into a consistent JSON response; production 500 responses hide internal messages.
- Login returns both access and refresh tokens in JSON in addition to cookies. This may be unintended exposure and should be reviewed separately.
- Timetable overlap prevention is application-level read-then-write and has no database constraint, so simultaneous conflicting creates may race.
- No application logic was changed during this QA work.

## Run

From `backend/` run:

```sh
npm test
```

The unauthenticated suite now probes all 44 protected endpoints plus three public auth validation cases. The previous 43 probes omitted POST /api/users/logout, POST /api/users/change-password, GET /api/users/me, and PATCH /api/users/update-account; all four now return 401 without credentials. Full authenticated tests remain blocked until Supertest and MongoDB Memory Server are installed. Install them from `backend/` with `npm install --save-dev supertest mongodb-memory-server`, then run `npm test`.


