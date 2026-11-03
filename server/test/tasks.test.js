import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import SwaggerParser from "@apidevtools/swagger-parser";
import { app } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { Task } from "../src/models/task.model.js";
import { openapi } from "../src/config/swagger.js";
import { taskRepository } from "../src/repositories/task.repository.js";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import net from "node:net";
let mongo;
const api = request(app);
const path = "/api/v1/tasks";
// Fetch dashboard counts through the dedicated HTTP contract.
async function readStats() {
  const response = await api.get(`${path}/stats`).expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "Task statistics retrieved successfully");
  return response.body.data;
}
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
beforeEach(async () => {
  await Task.deleteMany({});
});

test("CRUD, defaults, timestamps, reconnect persistence and 204 deletion", async () => {
  const created = await api
    .post(path)
    .send({ title: "  Ship assessment  ", dueDate: "2026-12-15" })
    .expect(201);
  const task = created.body.data;
  assert.equal(task.title, "Ship assessment");
  assert.equal(task.status, "pending");
  assert.equal(task.priority, "medium");
  assert.ok(task.createdAt && task.updatedAt);
  assert.equal(task.dueDate, "2026-12-15T00:00:00.000Z");
  await mongoose.disconnect();
  await connectDatabase(mongo.getUri());
  assert.equal(
    (await api.get(`${path}/${task._id}`).expect(200)).body.data.title,
    "Ship assessment",
  );
  const updated = await api
    .patch(`${path}/${task._id}`)
    .send({
      title: "Shipped",
      description: "Done",
      status: "completed",
      priority: "high",
      dueDate: null,
    })
    .expect(200);
  assert.equal(updated.body.data.status, "completed");
  assert.equal(updated.body.data.dueDate, null);
  const list = (await api.get(path).expect(200)).body.data;
  assert.equal(list.tasks.length, 1);
  assert.equal("stats" in list, false);
  assert.deepEqual(await readStats(), {
    total: 1,
    pending: 0,
    in_progress: 0,
    completed: 1,
  });
  assert.equal((await api.delete(`${path}/${task._id}`).expect(204)).text, "");
  await api.get(`${path}/${task._id}`).expect(404);
});

test("invalid bodies, enum values, dates, unknown keys and update fields are rejected", async () => {
  for (const body of [
    {},
    { title: "" },
    { title: "   " },
    { title: "a".repeat(151) },
    { title: "ok", description: "a".repeat(1001) },
    { title: "ok", status: "done" },
    { title: "ok", priority: "urgent" },
    { title: "ok", dueDate: "2026-02-30" },
    { title: "ok", dueDate: 123 },
    { title: { $ne: "" } },
    { title: "ok", extra: true },
  ]) {
    const response = await api.post(path).send(body).expect(400);
    assert.equal(response.body.success, false);
    assert.ok(response.body.errors.length);
  }
  const task = await Task.create({ title: "Original" });
  await api.patch(`${path}/${task.id}`).send({}).expect(400);
  await api
    .patch(`${path}/${task.id}`)
    .send({ $set: { title: "attack" } })
    .expect(400);
  await api
    .patch(`${path}/${task.id}`)
    .send({ createdAt: "2020-01-01" })
    .expect(400);
  assert.equal((await Task.findById(task.id)).title, "Original");
});

test("parameter validation and absent tasks have distinct 400/404 responses", async () => {
  for (const method of ["get", "patch", "delete"]) {
    let invalid = api[method](`${path}/bad-id`);
    if (method === "patch") invalid = invalid.send({ title: "x" });
    await invalid.expect(400);
    let missing = api[method](`${path}/507f1f77bcf86cd799439011`);
    if (method === "patch") missing = missing.send({ title: "x" });
    await missing.expect(404);
  }
});

test("search, combined filters, global statistics and semantic sorting", async () => {
  await Task.create([
    {
      title: "Alpha [draft]",
      priority: "low",
      status: "pending",
      dueDate: "2026-12-20",
      createdAt: "2026-01-01",
    },
    {
      title: "Beta",
      description: "Alpha in notes",
      priority: "high",
      status: "in_progress",
      dueDate: "2026-12-10",
      createdAt: "2026-01-03",
    },
    {
      title: "Gamma",
      priority: "medium",
      status: "completed",
      createdAt: "2026-01-02",
    },
  ]);
  assert.equal(
    (await api.get(path).query({ search: "ALPHA" })).body.data.tasks.length,
    2,
  );
  assert.equal(
    (await api.get(path).query({ search: "[draft]" })).body.data.tasks.length,
    1,
  );
  assert.equal(
    (await api.get(path).query({ search: ".*" })).body.data.tasks.length,
    0,
  );
  const filtered = (
    await api.get(path).query({ status: "in_progress", priority: "high" })
  ).body.data;
  assert.equal(filtered.tasks.length, 1);
  assert.deepEqual(await readStats(), {
    total: 3,
    pending: 1,
    in_progress: 1,
    completed: 1,
  });
  for (const [sortBy, sortOrder, titles] of [
    ["priority", "asc", ["Alpha [draft]", "Gamma", "Beta"]],
    ["priority", "desc", ["Beta", "Gamma", "Alpha [draft]"]],
    ["dueDate", "asc", ["Beta", "Alpha [draft]", "Gamma"]],
    ["dueDate", "desc", ["Alpha [draft]", "Beta", "Gamma"]],
    ["createdAt", "asc", ["Alpha [draft]", "Gamma", "Beta"]],
    ["createdAt", "desc", ["Beta", "Gamma", "Alpha [draft]"]],
  ])
    assert.deepEqual(
      (await api.get(path).query({ sortBy, sortOrder })).body.data.tasks.map(
        (t) => t.title,
      ),
      titles,
    );
});

test("rejects query pollution, unsupported sorting and operator injection", async () => {
  for (const query of [
    "sortBy=title",
    "sortOrder=sideways",
    "status=pending&status=completed",
    "priority=urgent",
    "search[$ne]=x",
    "unknown=x",
    "search=a&search=b",
  ])
    await api.get(`${path}?${query}`).expect(400);
});

test("health, headers, CORS, malformed JSON and size limit", async () => {
  const health = await api.get("/api/v1/health").expect(200);
  assert.equal(health.body.data.database, "connected");
  assert.ok(health.headers["x-content-type-options"]);
  assert.equal(health.headers["x-powered-by"], undefined);
  await api.get(path).set("Origin", "https://untrusted.example").expect(403);
  const allowed = await api
    .get(path)
    .set("Origin", "http://localhost:3000")
    .expect(200);
  assert.equal(
    allowed.headers["access-control-allow-origin"],
    "http://localhost:3000",
  );
  await api
    .post(path)
    .set("Content-Type", "application/json")
    .send("{bad")
    .expect(400);
  await api
    .post(path)
    .send({ title: "a".repeat(20000) })
    .expect(413);
  await api.get("/missing").expect(404);
});

test("OpenAPI validates and Swagger UI and specification are served", async () => {
  await SwaggerParser.validate(structuredClone(openapi));
  assert.match((await api.get("/api-docs/").expect(200)).text, /swagger-ui/);
  assert.equal(
    (await api.get("/api-docs/openapi.json").expect(200)).body.openapi,
    "3.0.3",
  );
});

test("unhandled failures do not expose internal messages", async () => {
  const original = Task.aggregate;
  try {
    Task.aggregate = () => {
      throw new Error("secret-database-credential");
    };
    const response = await api.get(path).expect(500);
    assert.equal(response.body.success, false);
    assert.ok(!JSON.stringify(response.body).includes("secret"));
  } finally {
    Task.aggregate = original;
  }
});

test("production entry point starts with configured MongoDB and serves HTTP", async () => {
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ["src/server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      MONGODB_URI: mongo.getUri(),
      NODE_ENV: "test",
    },
    stdio: "pipe",
    windowsHide: true,
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        ready = response.ok;
      } catch {
        /* Wait for the listener. */
      }
      if (ready) break;
      await delay(100);
    }
    assert.ok(ready, output);
    assert.match(output, /MongoDB connected/);
  } finally {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
});

test("pagination defaults, boundaries, filtered totals, and deterministic sorting", async () => {
  await Task.insertMany(
    Array.from({ length: 25 }, (_, index) => ({
      title: `Task ${index}`,
      status: index % 2 ? "completed" : "pending",
      priority: "medium",
      createdAt: new Date("2026-01-01"),
    })),
  );
  const first = (await api.get(path).expect(200)).body.data;
  assert.equal(first.tasks.length, 12);
  assert.deepEqual(first.pagination, {
    page: 1,
    limit: 12,
    total: 25,
    totalPages: 3,
  });
  const second = (await api.get(path).query({ page: 2 }).expect(200)).body.data;
  const last = (await api.get(path).query({ page: 3 }).expect(200)).body.data;
  assert.equal(last.tasks.length, 1);
  const ids = [...first.tasks, ...second.tasks, ...last.tasks].map(
    (task) => task._id,
  );
  assert.equal(new Set(ids).size, 25);
  assert.deepEqual(ids, [...ids].sort().reverse());
  const filtered = (
    await api
      .get(path)
      .query({ status: "pending", page: 2, limit: 12 })
      .expect(200)
  ).body.data;
  assert.equal(filtered.tasks.length, 1);
  assert.equal(filtered.pagination.total, 13);
  assert.equal((await readStats()).total, 25);
  const beyond = (await api.get(path).query({ page: 4 }).expect(200)).body.data;
  assert.deepEqual(beyond.tasks, []);
  assert.equal(beyond.pagination.totalPages, 3);
  const empty = (await api.get(path).query({ search: "absent" }).expect(200))
    .body.data;
  assert.deepEqual(empty.pagination, {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  assert.equal(
    (await api.get(path).query({ limit: 100 }).expect(200)).body.data.tasks
      .length,
    25,
  );
  const asc = (
    await api
      .get(path)
      .query({ sortBy: "priority", sortOrder: "asc", limit: 5, page: 2 })
      .expect(200)
  ).body.data;
  assert.deepEqual(
    asc.tasks.map((task) => task._id),
    [...ids].reverse().slice(5, 10),
  );
});

test("pagination rejects malformed, repeated, and unsafe query values", async () => {
  for (const query of [
    "page=0",
    "page=-1",
    "page=1.5",
    "page=abc",
    "page=Infinity",
    "page=9007199254740991",
    "page=1&page=2",
    "limit=0",
    "limit=101",
    "limit=-1",
    "limit=1.5",
    "limit=abc",
    "limit=12&limit=24",
  ]) {
    await api.get(`${path}?${query}`).expect(400);
  }
});

test("statistics return global counts and track confirmed CRUD changes", async () => {
  const zero = { total: 0, pending: 0, in_progress: 0, completed: 0 };
  assert.deepEqual(await readStats(), zero);
  const first = (await api.post(path).send({ title: "First" }).expect(201)).body
    .data;
  assert.deepEqual(await readStats(), { ...zero, total: 1, pending: 1 });
  await api
    .patch(`${path}/${first._id}`)
    .send({ status: "in_progress" })
    .expect(200);
  assert.deepEqual(await readStats(), { ...zero, total: 1, in_progress: 1 });
  const second = (
    await api
      .post(path)
      .send({ title: "Second", status: "completed" })
      .expect(201)
  ).body.data;
  assert.deepEqual(await readStats(), {
    ...zero,
    total: 2,
    in_progress: 1,
    completed: 1,
  });
  await api
    .get(path)
    .query({ search: "absent", limit: 1, page: 2 })
    .expect(200);
  assert.deepEqual(await readStats(), {
    ...zero,
    total: 2,
    in_progress: 1,
    completed: 1,
  });
  await api.delete(`${path}/${first._id}`).expect(204);
  assert.deepEqual(await readStats(), { ...zero, total: 1, completed: 1 });
  await api.delete(`${path}/${second._id}`).expect(204);
  assert.deepEqual(await readStats(), zero);
});

test("statistics reject all query parameters and never run for list requests", async () => {
  for (const query of [
    "status=pending",
    "page=1",
    "limit=12",
    "search=x",
    "unknown=x",
    "status=pending&status=completed",
  ])
    await api.get(`${path}/stats?${query}`).expect(400);
  const original = taskRepository.stats;
  let calls = 0;
  try {
    taskRepository.stats = () => {
      calls++;
      throw new Error("internal-stats-error");
    };
    const list = (await api.get(path).expect(200)).body.data;
    assert.deepEqual(Object.keys(list).sort(), ["pagination", "tasks"]);
    assert.equal(calls, 0);
    const response = await api.get(`${path}/stats`).expect(500);
    assert.equal(calls, 1);
    assert.equal(response.body.success, false);
    assert.ok(!JSON.stringify(response.body).includes("internal-stats-error"));
  } finally {
    taskRepository.stats = original;
  }
});

test("rate limit returns a consistent error envelope", async () => {
  let response;
  for (let i = 0; i < 301; i++) {
    response = await api.get("/api/v1/health");
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
  assert.equal(response.body.success, false);
  assert.deepEqual(response.body.errors, []);
});
