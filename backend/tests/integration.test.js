import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

// Optional integration dependencies are loaded without making the existing
// dependency-free HTTP tests fail when packages cannot be installed offline.
const [supertestModule, memoryModule] = await Promise.all([
  import("supertest").catch(() => null),
  import("mongodb-memory-server").catch(() => null),
]);
const blockedReason = !supertestModule || !memoryModule
  ? "BLOCKED: install the test-only dependencies `supertest` and `mongodb-memory-server`; this environment has neither package nor a local MongoDB server."
  : null;
const integrationTest = (name, fn) => test(name, { skip: blockedReason || false }, fn);

let mongoose;
let User;
let Task;
let QuestionLog;
let Timetable;
let Activity;
let Friend;
let Challenge;
let memoryServer;
let request;
let app;
let serial = 0;

const todayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const shiftDate = (dateKey, amount) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

before(async () => {
  if (blockedReason) return;

  // Fresh random credentials are confined to this test process and are never
  // read from .env. Memory Server provides an isolated, ephemeral database.
  process.env.ACCESS_TOKEN_SECRET = randomBytes(48).toString("hex");
  process.env.REFRESH_TOKEN_SECRET = randomBytes(48).toString("hex");
  process.env.ACCESS_TOKEN_EXPIRY = "15m";
  process.env.REFRESH_TOKEN_EXPIRY = "7d";
  process.env.NODE_ENV = "test";

  const [{ MongoMemoryServer }, mongooseModule, supertest] = await Promise.all([
    import("mongodb-memory-server"),
    import("mongoose"),
    import("supertest"),
  ]);
  mongoose = mongooseModule.default;
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri("duelstudy_integration_test");
  if (!/duelstudy_integration_test/.test(uri)) {
    throw new Error("Refusing to connect: test database name guard failed");
  }
  await mongoose.connect(uri, { dbName: "duelstudy_integration_test" });

  // Import models and app only after test-only token secrets are in place.
  const modelModules = await Promise.all([
    import("../src/models/users.model.js"), import("../src/models/tasks.model.js"),
    import("../src/models/questionLog.model.js"), import("../src/models/timetable.model.js"),
    import("../src/models/activity.model.js"), import("../src/models/friend.model.js"),
    import("../src/models/challenge.model.js"), import("../src/app.js"),
  ]);
  User = modelModules[0].User;
  Task = modelModules[1].Task;
  QuestionLog = modelModules[2].QuestionLog;
  Timetable = modelModules[3].Timetable;
  Activity = modelModules[4].Activity;
  Friend = modelModules[5].Friend;
  Challenge = modelModules[6].Challenge;
  app = modelModules[7].app;
  request = supertest.default;
  for (const model of [User, Task, QuestionLog, Timetable, Activity, Friend, Challenge]) {
    await model.init();
  }
});

afterEach(async () => {
  if (!mongoose?.connection?.readyState) return;
  // Data cleanup is limited to the in-memory database created above.
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
});

after(async () => {
  if (mongoose?.connection?.readyState) await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
});

const register = async (goal = "NEET") => {
  serial++;
  const email = `qa-${serial}-${randomBytes(4).toString("hex")}@example.test`;
  const password = "Integration-Test-Password-92!";
  const registered = await request(app).post("/api/users/register").send({
    name: `QA User ${serial}`, email, password, goal,
  });
  assert.equal(registered.status, 200, JSON.stringify(registered.body));
  const login = await request(app).post("/api/users/login").send({ email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { email, password, token: login.body.data.AccessToken, user: login.body.data.user };
};

const auth = (user) => request(app).set("Authorization", `Bearer ${user.token}`);
const expectStatus = (response, status) => assert.equal(response.status, status, JSON.stringify(response.body));
const getInviteCode = async (user) => (await auth(user).get("/api/users/me")).body.data.user.inviteCode;
const makeFriends = async (userA, userB) => {
  const invitation = await auth(userA).post("/api/friends/invite").send({ inviteCode: await getInviteCode(userB) });
  expectStatus(invitation, 201);
  const incoming = await auth(userB).get("/api/friends/requests/incoming");
  expectStatus(incoming, 200);
  const friendshipId = incoming.body.data[0]._id;
  expectStatus(await auth(userB).patch(`/api/friends/requests/${friendshipId}/accept`), 200);
  return friendshipId;
};

integrationTest("User endpoints: register, login, refresh, logout, password, profile, duplicate", async () => {
  const user = await register("CSE");
  expectStatus(await request(app).post("/api/users/register").send({}), 400);
  expectStatus(await request(app).post("/api/users/register").send({ name: "Duplicate", email: user.email, password: user.password, goal: "NEET" }), 409);
  expectStatus(await request(app).post("/api/users/login").send({ email: user.email, password: "wrong" }), 401);
  expectStatus(await request(app).post("/api/users/refresh-token").send({ refreshToken: "invalid-token" }), 401);
  const persistedBeforeRefresh = await User.findOne({ email: user.email }).select("+refreshToken");
  expectStatus(await request(app).post("/api/users/refresh-token").send({ refreshToken: persistedBeforeRefresh.refreshToken }), 200);
  expectStatus(await auth(user).get("/api/users/me"), 200);
  expectStatus(await auth(user).patch("/api/users/update-account").send({ name: "Renamed QA" }), 200);
  const freshLogin = await request(app).post("/api/users/login").send({ email: user.email, password: user.password });
  expectStatus(freshLogin, 200);
  const logoutToken = freshLogin.body.data.AccessToken;
  expectStatus(await request(app).post("/api/users/logout").set("Authorization", `Bearer ${logoutToken}`), 200);
  // Logout clears refresh state; it does not revoke an already-issued access JWT.
  const persisted = await User.findOne({ email: user.email }).select("+refreshToken");
  assert.equal(persisted.refreshToken, undefined);
  expectStatus(await auth(user).post("/api/users/change-password").send({ oldPassword: user.password, newPassword: "New-Test-Password-93!" }), 200);
});

integrationTest("Study Planner endpoints: CRUD, status, filters, target, progress, ownership, persistence", async () => {
  const owner = await register();
  const other = await register("CSE");
  const date = todayKey();
  const created = await auth(owner).post("/api/planner/tasks").send({ title: "Integration task", scheduledDate: date, durationMinutes: 45, priority: "high" });
  expectStatus(created, 201);
  const id = created.body.data._id;
  assert.ok(await Task.findById(id));
  expectStatus(await auth(owner).get("/api/planner/tasks?date=2020-99-99"), 400);
  assert.equal((await auth(owner).get("/api/planner/tasks?status=planned")).body.data.length, 1);
  expectStatus(await auth(owner).get(`/api/planner/tasks/${id}`), 200);
  expectStatus(await auth(other).get(`/api/planner/tasks/${id}`), 404);
  expectStatus(await auth(owner).patch(`/api/planner/tasks/${id}`).send({ title: "Updated task" }), 200);
  expectStatus(await auth(owner).patch(`/api/planner/tasks/${id}`).send({ durationMinutes: 0 }), 400);
  expectStatus(await auth(owner).patch(`/api/planner/tasks/${id}/status`).send({ status: "completed" }), 200);
  expectStatus(await auth(owner).get("/api/planner/weekly-progress"), 200);
  expectStatus(await auth(owner).patch("/api/planner/weekly-target").send({ weeklyTargetHours: 30 }), 200);
  expectStatus(await auth(owner).patch("/api/planner/weekly-target").send({ weeklyTargetHours: 0 }), 400);
  expectStatus(await auth(owner).patch(`/api/planner/tasks/${id}/status`).send({ status: "unknown" }), 400);
  expectStatus(await auth(owner).delete(`/api/planner/tasks/${id}`), 200);
  assert.equal(await Task.findById(id), null);
  expectStatus(await auth(owner).delete(`/api/planner/tasks/${id}`), 404);
  expectStatus(await auth(owner).get("/api/planner/tasks/not-a-mongodb-id"), 400);
});

integrationTest("Question Tracker endpoints: NEET and CSE configuration, logs, summaries, ownership, delete", async () => {
  const neet = await register("NEET");
  const cse = await register("CSE");
  const date = todayKey();
  const neetConfig = await auth(neet).get("/api/questions/config");
  const cseConfig = await auth(cse).get("/api/questions/config");
  expectStatus(neetConfig, 200); expectStatus(cseConfig, 200);
  assert.deepEqual(neetConfig.body.data.metrics.map((x) => x.key), ["physics", "chemistry", "biology"]);
  assert.deepEqual(cseConfig.body.data.metrics.map((x) => x.key), ["leetcode", "gitCommits"]);
  const nlog = await auth(neet).post("/api/questions/logs").send({ date, metrics: { physics: 12, chemistry: 8 } });
  await auth(neet).post("/api/questions/logs").send({ date, metrics: { physics: 14 } });
  assert.equal(await QuestionLog.countDocuments({ userId: neet.user._id }), 1);
  const clog = await auth(cse).post("/api/questions/logs").send({ date, metrics: { leetcode: 7, gitCommits: 2 } });
  expectStatus(nlog, 200); expectStatus(clog, 200);
  expectStatus(await auth(neet).post("/api/questions/logs").send({ date, metrics: { leetcode: 3 } }), 400);
  expectStatus(await auth(cse).post("/api/questions/logs").send({ date, metrics: { physics: 3 } }), 400);
  expectStatus(await auth(neet).get(`/api/questions/logs?date=${date}`), 200);
  expectStatus(await auth(neet).get(`/api/questions/logs?date=${date}&startDate=${date}`), 400);
  assert.equal((await auth(neet).get(`/api/questions/daily-summary?date=${date}`)).body.data.total, 14);
  assert.equal((await auth(cse).get("/api/questions/weekly-summary")).body.data.total, 9);
  expectStatus(await auth(cse).get(`/api/questions/logs/${nlog.body.data._id}`), 404);
  expectStatus(await auth(neet).delete(`/api/questions/logs/${nlog.body.data._id}`), 200);
  assert.equal(await QuestionLog.findById(nlog.body.data._id), null);
  expectStatus(await auth(neet).get("/api/questions/daily-summary?date=2020-99-99"), 400);
  expectStatus(await auth(neet).get("/api/questions/logs/not-a-mongodb-id"), 400);
});

integrationTest("Timetable endpoints: create/list/detail/update/delete/reset, overlap and ownership", async () => {
  const owner = await register(); const other = await register("CSE");
  const slot = await auth(owner).post("/api/timetable/").send({ title: "Physics", day: "Monday", startTime: "09:00", endTime: "10:00" });
  expectStatus(slot, 201); const id = slot.body.data._id;
  assert.ok(await Timetable.findById(id));
  expectStatus(await auth(owner).post("/api/timetable/").send({ title: "Overlap", day: "Monday", startTime: "09:30", endTime: "10:30" }), 409);
  expectStatus(await auth(owner).post("/api/timetable/").send({ title: "Bad time", day: "Monday", startTime: "10:00", endTime: "09:00" }), 400);
  expectStatus(await auth(owner).get("/api/timetable/"), 200);
  expectStatus(await auth(owner).get(`/api/timetable/${id}`), 200);
  expectStatus(await auth(other).get(`/api/timetable/${id}`), 404);
  expectStatus(await auth(owner).patch(`/api/timetable/${id}`).send({ title: "Updated Physics" }), 200);
  expectStatus(await auth(owner).patch(`/api/timetable/${id}`).send({ startTime: "10:30", endTime: "11:00" }), 200);
  expectStatus(await auth(owner).delete(`/api/timetable/${id}`), 200);
  await auth(owner).post("/api/timetable/").send({ title: "Reset me", day: "Tuesday", startTime: "11:00", endTime: "12:00" });
  const reset = await auth(owner).delete("/api/timetable/reset");
  expectStatus(reset, 200); assert.equal(reset.body.data.deletedCount, 1);
  expectStatus(await auth(owner).get(`/api/timetable/${id}`), 404);
  expectStatus(await auth(owner).get("/api/timetable/not-a-mongodb-id"), 400);
});

integrationTest("Activity Tracker endpoints: accumulation, today, calendar, streak and validation", async () => {
  const user = await register(); const today = todayKey();
  expectStatus(await auth(user).post("/api/activity/log").send({ minutes: 30, date: today }), 200);
  expectStatus(await auth(user).post("/api/activity/log").send({ minutes: 20, date: today }), 200);
  expectStatus(await auth(user).post("/api/activity/log").send({ minutes: 0 }), 400);
  expectStatus(await auth(user).post("/api/activity/log").send({ minutes: 10, date: shiftDate(today, 1) }), 400);
  const todayResponse = await auth(user).get("/api/activity/today");
  expectStatus(todayResponse, 200); assert.equal(todayResponse.body.data.studyMinutes, 50); assert.equal(todayResponse.body.data.sessionsCount, 2);
  const [year, month] = today.split("-").map(Number);
  const calendar = await auth(user).get(`/api/activity/calendar?year=${year}&month=${month}`);
  expectStatus(calendar, 200); assert.equal(calendar.body.data.totalStudyMinutes, 50); assert.equal(calendar.body.data.activeDays, 1);
  expectStatus(await auth(user).get("/api/activity/calendar?year=2024&month=13"), 400);
  const streak = await auth(user).get("/api/activity/streak");
  expectStatus(streak, 200); assert.ok(streak.body.data.currentStreak >= 1); assert.equal(streak.body.data.longestStreak, 1);
  assert.equal(await Activity.countDocuments({ userId: user.user._id, dateKey: today }), 1);
});

integrationTest("Friends endpoints: invite, duplicate, incoming/outgoing, reject, cancel, accept, compare, remove", async () => {
  const a = await register("NEET"); const b = await register("CSE"); const outsider = await register();
  const inviteCodeB = await getInviteCode(b);
  const sent = await auth(a).post("/api/friends/invite").send({ inviteCode: inviteCodeB });
  expectStatus(sent, 201); const id = sent.body.data.friendship._id;
  expectStatus(await auth(a).post("/api/friends/invite").send({ inviteCode: inviteCodeB }), 409);
  expectStatus(await auth(a).get("/api/friends/requests/outgoing"), 200);
  expectStatus(await auth(b).get("/api/friends/requests/incoming"), 200);
  expectStatus(await auth(b).patch(`/api/friends/requests/${id}/reject`), 200);
  assert.equal((await Friend.findById(id)).status, "rejected");
  const resent = await auth(a).post("/api/friends/invite").send({ inviteCode: inviteCodeB }); expectStatus(resent, 201);
  const id2 = resent.body.data.friendship._id;
  expectStatus(await auth(a).delete(`/api/friends/requests/${id2}`), 200);
  const finalReq = await auth(a).post("/api/friends/invite").send({ inviteCode: inviteCodeB });
  const id3 = finalReq.body.data.friendship._id;
  expectStatus(await auth(b).patch(`/api/friends/requests/${id3}/accept`), 200);
  assert.equal((await Friend.findById(id3)).status, "accepted");
  expectStatus(await auth(a).get("/api/friends/"), 200);
  const compare = await auth(a).get(`/api/friends/${b.user._id}/compare`); expectStatus(compare, 200); assert.equal(compare.body.data.sameGoal, false);
  expectStatus(await auth(outsider).get(`/api/friends/${b.user._id}/compare`), 403);
  expectStatus(await auth(a).delete(`/api/friends/${b.user._id}`), 200);
  assert.equal(await Friend.countDocuments({ _id: id3 }), 0);
  expectStatus(await auth(a).get("/api/friends/not-a-mongodb-id/compare"), 400);
  expectStatus(await auth(a).patch("/api/friends/requests/not-a-mongodb-id/accept"), 400);
});

integrationTest("Competition endpoints: challenge creation/join/progress, leaderboard and badges", async () => {
  const creator = await register("NEET"); const friend = await register("CSE"); const outsider = await register();
  await makeFriends(creator, friend);
  const today = todayKey();
  const challengeResponse = await auth(creator).post("/api/competition/challenges").send({
    title: "Weekly minutes", description: "test", metric: "studyMinutes", target: 60,
    startDate: today, endDate: shiftDate(today, 6),
  });
  expectStatus(challengeResponse, 201); const challengeId = challengeResponse.body.data._id;
  expectStatus(await auth(creator).post("/api/competition/challenges").send({ title: "x", metric: "invalid", target: 1, startDate: today, endDate: today }), 400);
  expectStatus(await auth(outsider).post(`/api/competition/challenges/${challengeId}/join`), 403);
  expectStatus(await auth(friend).post(`/api/competition/challenges/${challengeId}/join`), 200);
  expectStatus(await auth(friend).post(`/api/competition/challenges/${challengeId}/join`), 409);
  for (const user of [creator, friend]) {
    expectStatus(await auth(user).post("/api/activity/log").send({ minutes: 60, date: today }), 200);
  }
  const challenge = await auth(friend).get(`/api/competition/challenges/${challengeId}`);
  expectStatus(challenge, 200);
  assert.equal(challenge.body.data.progress.find((x) => x.userId === creator.user._id).progress, 60);
  expectStatus(await auth(friend).get("/api/competition/challenges"), 200);
  const leaderboard = await auth(creator).get("/api/competition/leaderboard/weekly"); expectStatus(leaderboard, 200);
  assert.equal(leaderboard.body.data.leaderboard.length, 2);
  assert.ok(leaderboard.body.data.leaderboard.every((x) => x.weeklyStudyMinutes === 60));
  const badges = await auth(creator).get("/api/competition/badges"); expectStatus(badges, 200);
  assert.ok(badges.body.data.badges.some((badge) => badge.id === "first-session" && badge.unlocked));
  expectStatus(await auth(friend).get("/api/competition/challenges/not-a-mongodb-id"), 400);
});

