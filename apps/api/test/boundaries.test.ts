import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { buildApp } from "../src/app.js";
import { migrate } from "../src/db.js";
test("concurrent retry, corrections, version consent, expiry and ranking boundaries", async () => {
  const pg = new PGlite(),
    db = drizzle(pg);
  await migrate(db);
  const app = await buildApp({
    db,
    key: randomBytes(32).toString("base64"),
    testAuth: true,
    adminSubjects: ["test:operator"],
  });
  const send = async (
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
      await send("POST", "/auth/test", undefined, { subject: "operator" })
    ).body.token;
    const auth = (
        await send("POST", "/auth/test", undefined, { subject: "person" })
      ).body,
      token = auth.token;
    const cfg = {
      title: { en: "Test", ko: "검증" },
      description: { en: "Test", ko: "검증" },
      recipient: "Lab",
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2040-01-01T00:00:00.000Z",
      types: ["steps"],
      consent: { en: "Agree", ko: "동의" },
      retentionDays: 1,
      points: 20,
      surveyPoints: 5,
      periodDays: 1,
      autoApprove: false,
      minimumRecords: 1,
      eligibility: [],
      survey: [],
      testOnly: true,
    };
    const s = (await send("POST", "/admin/studies", admin, cfg)).body;
    await send("POST", `/admin/studies/${s.id}/status`, admin, {
      status: "published",
      approvalReference: "TEST",
    });
    await send("POST", "/enrollments", token, {
      studyId: s.id,
      version: 1,
      accepted: true,
      answers: {},
    });
    const w = (await send("GET", `/studies/${s.id}/window`, token)).body;
    const payload = {
      studyId: s.id,
      version: 1,
      activity: "health",
      periodStart: w.start,
      periodEnd: w.end,
      records: [
        {
          id: "one",
          type: "steps",
          origin: "test",
          start: w.start,
          end: w.start,
          unit: "count",
          value: { count: 100 },
        },
      ],
    };
    assert.equal(
      (
        await send("POST", "/submissions", token, {
          ...payload,
          mode: "automatic",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await send("POST", "/submissions", token, {
          ...payload,
          records: [
            {
              ...payload.records[0],
              value: { count: 100, email: "not allowed" },
            },
          ],
        })
      ).status,
      400,
    );
    const results = await Promise.all([
      send("POST", "/submissions", token, payload),
      send("POST", "/submissions", token, payload),
      send("POST", "/submissions", token, payload),
    ]);
    results.forEach((r) => assert.equal(r.status, 200));
    assert.equal(new Set(results.map((r) => r.body.id)).size, 1);
    const id = results[0].body.id;
    assert.equal((await send("GET", "/points", token)).body.pending, 20);
    await send("POST", `/admin/submissions/${id}/review`, admin, {
      status: "needs_correction",
      reason: "Confirm source",
    });
    assert.equal(
      (await send("POST", "/submissions", token, payload)).body.id,
      id,
    );
    await send("POST", `/admin/submissions/${id}/review`, admin, {
      status: "approved",
      reason: "Reviewed",
    });
    assert.equal(
      (
        await send("POST", `/admin/submissions/${id}/review`, admin, {
          status: "approved",
          reason: "Again",
        })
      ).status,
      409,
    );
    assert.equal((await send("GET", "/points", token)).body.total, 20);
    assert.equal((await send("GET", "/leaderboard", token)).body.length, 0);
    await send("PATCH", "/me", token, {
      nickname: "Member",
      language: "ko",
      ranking: true,
    });
    assert.equal((await send("GET", "/leaderboard", token)).body[0].total, 20);
    const eventId = randomUUID();
    await send("POST", "/admin/points/adjust", admin, {
      userId: auth.user.id,
      amount: 3,
      reason: "Correction",
      eventId,
    });
    await send("POST", "/admin/points/adjust", admin, {
      userId: auth.user.id,
      amount: 3,
      reason: "Correction",
      eventId,
    });
    assert.equal((await send("GET", "/points", token)).body.total, 23);
    await send("PUT", "/admin/studies/" + s.id, admin, { ...cfg, points: 30 });
    assert.equal(
      (await send("GET", "/studies/" + s.id, token)).body.version,
      1,
    );
    await send("POST", `/admin/studies/${s.id}/status`, admin, {
      status: "published",
      approvalReference: "TEST v2",
    });
    assert.equal(
      (await send("POST", "/submissions", token, payload)).status,
      409,
    );
    const exp = (await send("POST", "/admin/exports", admin, { studyId: s.id }))
      .body;
    await db.execute(
      sql`update exports set expires_at=now()-interval '1 second' where id=${exp.id}`,
    );
    assert.equal((await send("GET", exp.download, admin)).status, 404);
  } finally {
    await app.close();
    await pg.close();
  }
});
