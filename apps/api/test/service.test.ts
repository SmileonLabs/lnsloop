import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { randomBytes } from "node:crypto";
import { buildApp } from "../src/app.js";
import { migrate } from "../src/db.js";
import { vault } from "../src/crypto.js";
test("real SQL: authorization, consent, idempotent awards, scope, withdrawal, export and deletion", async () => {
  const pg = new PGlite();
  const db = drizzle(pg);
  await migrate(db);
  const key = randomBytes(32).toString("base64");
  const app = await buildApp({
    db,
    key,
    testAuth: true,
    adminSubjects: ["test:operator"],
  });
  const call = async (
    method: string,
    url: string,
    token?: string,
    payload?: unknown,
  ) => {
    const r = await app.inject({
      method: method as any,
      url,
      headers: token ? { authorization: "Bearer " + token } : {},
      payload: payload as any,
    });
    return { status: r.statusCode, body: r.json() };
  };
  try {
    const admin = (
      await call("POST", "/auth/test", undefined, { subject: "operator" })
    ).body.token;
    const a = (
      await call("POST", "/auth/test", undefined, { subject: "alice" })
    ).body.token;
    const b = (await call("POST", "/auth/test", undefined, { subject: "bob" }))
      .body.token;
    assert.equal((await call("GET", "/admin/studies", a)).status, 403);
    const config = {
      title: { en: "Test", ko: "테스트" },
      description: { en: "Test only", ko: "테스트 전용" },
      recipient: "Test Lab",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2030-01-01T00:00:00.000Z",
      types: ["steps"],
      consent: { en: "I agree", ko: "동의" },
      retentionDays: 1,
      points: 40,
      surveyPoints: 10,
      periodDays: 1,
      autoApprove: true,
      minimumRecords: 1,
      eligibility: [],
      survey: [
        {
          id: "q",
          label: { en: "How?", ko: "상태" },
          options: ["good", "okay"],
        },
      ],
      testOnly: true,
    };
    const s = (await call("POST", "/admin/studies", admin, config)).body;
    assert.equal(
      (
        await call("POST", `/admin/studies/${s.id}/status`, admin, {
          status: "published",
          approvalReference: "TEST ONLY",
        })
      ).status,
      200,
    );
    const window = (await call("GET", `/studies/${s.id}/window`, a)).body;
    const record = {
      id: "r1",
      type: "steps",
      start: window.start,
      end: window.start,
      origin: "test",
      unit: "count",
      value: { count: 100 },
    };
    const input = {
      studyId: s.id,
      version: 1,
      activity: "health",
      periodStart: window.start,
      periodEnd: window.end,
      records: [record],
    };
    assert.equal((await call("POST", "/submissions", a, input)).status, 409);
    assert.equal(
      (
        await call("POST", "/enrollments", a, {
          studyId: s.id,
          version: 1,
          accepted: true,
          answers: {},
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call("POST", "/submissions", a, {
          ...input,
          records: [{ ...record, type: "weight" }],
        })
      ).status,
      400,
    );
    const first = await call("POST", "/submissions", a, input);
    assert.equal(first.status, 200);
    assert.equal(first.body.status, "approved");
    const again = await call("POST", "/submissions", a, input);
    assert.equal(first.body.id, again.body.id);
    assert.equal((await call("GET", "/points", a)).body.total, 40);
    assert.equal(
      (await call("GET", `/submissions/${first.body.id}`, b)).status,
      404,
    );
    assert.equal((await call("GET", "/points", b)).body.total, 0);
    const exp = (await call("POST", "/admin/exports", admin, { studyId: s.id }))
      .body;
    assert.equal((await call("GET", exp.download, admin)).body.length, 1);
    const survey = {
      ...input,
      activity: "survey",
      records: [],
      answers: { q: "good" },
    };
    await call("POST", "/submissions", a, survey);
    assert.equal((await call("GET", "/points", a)).body.total, 50);
    await call("POST", `/enrollments/${s.id}/withdraw`, a, {});
    assert.equal((await call("POST", "/submissions", a, input)).status, 409);
    assert.equal((await call("GET", "/points", a)).body.total, 50);
    assert.equal((await call("GET", exp.download, admin)).body.length, 0);
    const user = (await call("GET", "/me", a)).body;
    await call("POST", "/me/deletion", a, {});
    assert.equal((await call("GET", "/me", a)).status, 401);
    assert.equal(
      (await call("POST", `/admin/deletions/${user.id}`, admin, {})).status,
      409,
    );
  } finally {
    await app.close();
    await pg.close();
  }
});
test("authenticated encryption rejects tampering and production rejects test auth", async () => {
  const key = randomBytes(32).toString("base64"),
    v = vault(key);
  const sealed = v.seal({ health: 42 });
  assert.deepEqual(v.open(sealed), { health: 42 });
  assert.throws(() => v.open(sealed.slice(0, -5) + "AAAAA"));
  await assert.rejects(() =>
    buildApp({ db: {} as any, key, testAuth: true, production: true }),
  );
});
