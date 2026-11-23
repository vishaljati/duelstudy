import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { app } from "../src/app.js";
import { errorHandler } from "../src/middlewares/error.middleware.js";

const protectedEndpoints = [
  ["GET", "/api/planner/weekly-progress"], ["PATCH", "/api/planner/weekly-target"],
  ["POST", "/api/planner/tasks"], ["GET", "/api/planner/tasks"], ["GET", "/api/planner/tasks/:id"], ["PATCH", "/api/planner/tasks/:id"], ["PATCH", "/api/planner/tasks/:id/status"], ["DELETE", "/api/planner/tasks/:id"],
  ["POST", "/api/users/logout"], ["POST", "/api/users/change-password"], ["GET", "/api/users/me"], ["PATCH", "/api/users/update-account"],
  ["GET", "/api/questions/config"], ["GET", "/api/questions/daily-summary"], ["GET", "/api/questions/weekly-summary"], ["POST", "/api/questions/logs"], ["GET", "/api/questions/logs"], ["GET", "/api/questions/logs/:id"], ["DELETE", "/api/questions/logs/:id"],
  ["DELETE", "/api/timetable/reset"], ["POST", "/api/timetable/"], ["GET", "/api/timetable/"], ["GET", "/api/timetable/:id"], ["PATCH", "/api/timetable/:id"], ["DELETE", "/api/timetable/:id"],
  ["POST", "/api/activity/log"], ["GET", "/api/activity/today"], ["GET", "/api/activity/calendar"], ["GET", "/api/activity/streak"],
  ["POST", "/api/friends/invite"], ["GET", "/api/friends/requests/incoming"], ["GET", "/api/friends/requests/outgoing"], ["PATCH", "/api/friends/requests/:id/accept"], ["PATCH", "/api/friends/requests/:id/reject"], ["DELETE", "/api/friends/requests/:id"], ["GET", "/api/friends/"], ["DELETE", "/api/friends/:friendId"], ["GET", "/api/friends/:friendId/compare"],
  ["GET", "/api/competition/leaderboard/weekly"], ["GET", "/api/competition/badges"], ["POST", "/api/competition/challenges"], ["GET", "/api/competition/challenges"], ["GET", "/api/competition/challenges/:id"], ["POST", "/api/competition/challenges/:id/join"],
];

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

test("all protected route handlers reject requests without credentials", async (t) => {
  for (const [method, route] of protectedEndpoints) {
    await t.test(`${method} ${route}`, async () => {
      const path = route.replace(":id", "000000000000000000000001").replace(":friendId", "000000000000000000000001");
      const response = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json" }, body: ["POST", "PATCH"].includes(method) ? "{}" : undefined });
      assert.equal(response.status, 401, `expected 401, got ${response.status}`);
    });
  }
});

test("public auth routes exist and validate missing inputs", async (t) => {
  const cases = [
    ["POST", "/api/users/register", {}, 400],
    ["POST", "/api/users/login", {}, 400],
    ["POST", "/api/users/refresh-token", {}, 401],
  ];
  for (const [method, path, body, expectedStatus] of cases) await t.test(`${method} ${path}`, async () => {
    const response = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(response.status, expectedStatus);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(typeof payload.message, "string");
  });
});

test("unexpected errors return a safe JSON 500 response", async () => {
  const testApp = express();
  testApp.get("/error", (_req, _res, next) => next(new Error("unexpected test failure")));
  testApp.use(errorHandler);
  const testServer = testApp.listen(0);
  await new Promise((resolve) => testServer.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${testServer.address().port}/error`);
    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.data, null);
    assert.equal(typeof payload.message, "string");
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
  }
});

test("production responses hide unexpected error details", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let status;
  let payload;

  try {
    errorHandler(new Error("sensitive internal detail"), {}, {
      status(value) { status = value; return this; },
      json(value) { payload = value; return this; },
    }, () => {});
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }

  assert.equal(status, 500);
  assert.equal(payload.message, "Internal Server Error");
  assert.doesNotMatch(JSON.stringify(payload), /sensitive internal detail|stack/i);
});
