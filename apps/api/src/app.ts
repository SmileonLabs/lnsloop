import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import { OAuth2Client } from "google-auth-library";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  studySchema,
  submissionSchema,
  type StudyConfig,
} from "@loop/contracts";
import { rows, type Database } from "./db.js";
import { hash, vault } from "./crypto.js";
type Options = {
  db: Database;
  key: string;
  googleAudience?: string;
  adminSubjects?: string[];
  testAuth?: boolean;
  production?: boolean;
  origin?: string;
};
function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode: status });
}
const uuid = z.string().uuid();
export async function buildApp(o: Options) {
  if (o.production && o.testAuth)
    throw new Error("Test authentication is prohibited in production");
  const app = Fastify({ logger: false, bodyLimit: 8 * 1024 * 1024 });
  const v = vault(o.key);
  await app.register(cors, {
    origin: (o.origin ?? "http://localhost:5173").split(","),
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(swagger, {
    openapi: { info: { title: "LNS Loop API", version: "1.0.0" } },
  });
  const audit = async (
    db: Database,
    actor: string,
    action: string,
    target: string,
  ) =>
    db.execute(
      sql`insert into audit values(${randomUUID()},${actor},${action},${target},now())`,
    );
  async function user(req: any, admin = false) {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) fail(401, "Sign in required");
    const [u] = await rows(
      o.db,
      sql`select u.* from users u join sessions s on s.user_id=u.id where s.hash=${hash(token)} and s.expires_at>now() and not u.deletion_requested`,
    );
    if (!u) fail(401, "Session expired");
    if (admin && u.role !== "admin") fail(403, "Administrator required");
    return u;
  }
  async function study(db: Database, id: string, includeDraft = false) {
    uuid.parse(id);
    const [s] = await rows(
      db,
      sql`select * from studies where id=${id} and (${includeDraft} or status<>'draft') order by version desc limit 1`,
    );
    if (!s) fail(404, "Study not found");
    return s as {
      id: string;
      version: number;
      status: string;
      config: StudyConfig;
    };
  }
  async function active(db: Database, uid: string, s: any) {
    const [e] = await rows(
      db,
      sql`select * from enrollments where user_id=${uid} and study_id=${s.id} for update`,
    );
    if (
      !e ||
      e.withdrawn_at ||
      e.version !== s.version ||
      s.status !== "published" ||
      Date.parse(s.config.endsAt) <= Date.now()
    )
      fail(409, "Active participation and current consent required");
    return e;
  }
  const publicSubmission = (s: any) => {
    const { payload, user_id, ...rest } = s;
    return rest;
  };
  app.setErrorHandler((err: any, _req, reply) =>
    reply.code(err instanceof z.ZodError ? 400 : (err.statusCode ?? 500)).send({
      error:
        err instanceof z.ZodError
          ? "Invalid input"
          : err.statusCode
            ? err.message
            : "Internal server error",
    }),
  );
  app.get("/health", async () => ({ ok: true }));
  app.get("/openapi.json", async () => app.swagger());
  app.get("/auth/config", async () => ({
    googleConfigured: Boolean(o.googleAudience),
    testAuth: Boolean(o.testAuth && !o.production),
  }));
  async function login(subject: string, email: string, name: string) {
    const role = o.adminSubjects?.includes(subject) ? "admin" : "participant";
    const id = randomUUID();
    const [u] = await rows(
      o.db,
      sql`insert into users(id,subject,email,nickname,role) values(${id},${subject},${email},${name},${role}) on conflict(subject) do update set email=excluded.email,role=excluded.role returning *`,
    );
    if (u.deletion_requested) fail(403, "Account deletion in progress");
    const token = randomBytes(32).toString("base64url");
    await o.db.execute(
      sql`insert into sessions values(${hash(token)},${u.id},now()+interval '7 days')`,
    );
    return { token, user: u };
  }
  app.post("/auth/google", async (req) => {
    if (!o.googleAudience) fail(503, "Google OAuth is not configured");
    const { idToken } = z
      .object({ idToken: z.string().min(1) })
      .parse(req.body);
    let p;
    try {
      p = (
        await new OAuth2Client().verifyIdToken({
          idToken,
          audience: o.googleAudience!.split(","),
        })
      ).getPayload();
    } catch {
      fail(401, "Invalid Google identity");
    }
    if (!p?.sub || !p.email_verified || !p.email)
      fail(401, "Verified Google account required");
    return login(p.sub, p.email, p.name ?? "Member");
  });
  if (o.testAuth && !o.production)
    app.post("/auth/test", async (req) => {
      const { subject } = z
        .object({ subject: z.string().min(1).max(80) })
        .parse(req.body);
      return login("test:" + subject, subject + "@example.test", subject);
    });
  app.post("/auth/logout", async (req) => {
    await user(req);
    await o.db.execute(
      sql`delete from sessions where hash=${hash(req.headers.authorization!.slice(7))}`,
    );
    return { ok: true };
  });
  app.get("/me", async (req) => {
    const u = await user(req);
    const { subject, ...safe } = u;
    return safe;
  });
  app.patch("/me", async (req) => {
    const u = await user(req),
      b = z
        .object({
          nickname: z.string().min(1).max(40),
          language: z.enum(["ko", "en"]),
          ranking: z.boolean(),
        })
        .parse(req.body);
    await o.db.execute(
      sql`update users set nickname=${b.nickname},language=${b.language},ranking=${b.ranking} where id=${u.id}`,
    );
    return b;
  });
  app.post("/me/deletion", async (req) => {
    const u = await user(req);
    await o.db.transaction(async (tx) => {
      await tx.execute(
        sql`update users set deletion_requested=true,ranking=false where id=${u.id}`,
      );
      await tx.execute(
        sql`update enrollments set withdrawn_at=now(),auto_share=false where user_id=${u.id}`,
      );
      await tx.execute(sql`delete from sessions where user_id=${u.id}`);
      await audit(tx, u.id, "deletion.request", u.id);
    });
    return { status: "requested" };
  });
  app.get("/studies", async (req) => {
    await user(req);
    return rows(
      o.db,
      sql`select * from (select distinct on(id) * from studies where status<>'draft' order by id,version desc) s where status='published'`,
    );
  });
  app.get("/studies/:id", async (req) => {
    await user(req);
    const s = await study(o.db, (req.params as any).id);
    if (s.status === "draft") fail(404, "Study not found");
    return s;
  });
  app.get("/enrollments", async (req) => {
    const u = await user(req);
    return rows(
      o.db,
      sql`select study_id,version,consent_at,withdrawn_at,auto_share from enrollments where user_id=${u.id}`,
    );
  });
  app.post("/enrollments", async (req) => {
    const u = await user(req),
      b = z
        .object({
          studyId: uuid,
          version: z.number().int(),
          accepted: z.literal(true),
          selections: z.record(z.boolean()).default({}),
          answers: z.record(z.string()),
        })
        .parse(req.body);
    return o.db.transaction(async (tx) => {
      const s = await study(tx, b.studyId);
      if (
        s.status !== "published" ||
        s.version !== b.version ||
        Date.parse(s.config.endsAt) <= Date.now()
      )
        fail(409, "Study unavailable or updated");
      if (
        (s.config.consentItems ?? []).some(
          (c) => c.required && !b.selections[c.id],
        )
      )
        fail(400, "Required consent missing");
      if (
        Object.keys(b.answers).some(
          (id) => !s.config.eligibility.some((q) => q.id === id),
        )
      )
        fail(400, "Unknown eligibility question");
      for (const q of s.config.eligibility) {
        if (!q.options.includes(b.answers[q.id]))
          fail(400, "Answer all eligibility questions");
        if (q.eligibleAnswer && b.answers[q.id] !== q.eligibleAnswer)
          fail(422, "Participation criteria not met");
      }
      await tx.execute(
        sql`insert into enrollments(user_id,study_id,version,answers) values(${u.id},${s.id},${s.version},${v.seal({ eligibility: b.answers, consents: b.selections })}) on conflict(user_id,study_id) do update set version=excluded.version,answers=excluded.answers,consent_at=now(),withdrawn_at=null,auto_share=false`,
      );
      await audit(tx, u.id, "consent.accept", s.id + ":" + s.version);
      return { status: "active" };
    });
  });
  app.get("/consents/:id", async (req) => {
    const u = await user(req),
      id = uuid.parse((req.params as any).id);
    const [e] = await rows(
      o.db,
      sql`select e.study_id,e.version,e.consent_at,e.withdrawn_at,e.answers,s.config->'consent' as text,s.config->'consentItems' as items from enrollments e join studies s on s.id=e.study_id and s.version=e.version where e.user_id=${u.id} and e.study_id=${id}`,
    );
    if (!e) fail(404, "Consent not found");
    const {answers,...copy}=e;return {...copy,selections:v.open(answers).consents??{}};
  });
  app.post("/enrollments/:id/withdraw", async (req) => {
    const u = await user(req),
      id = uuid.parse((req.params as any).id);
    await o.db.transaction(async (tx) => {
      await tx.execute(
        sql`update enrollments set withdrawn_at=now(),auto_share=false where user_id=${u.id} and study_id=${id}`,
      );
      await audit(tx, u.id, "consent.withdraw", id);
    });
    return { ok: true };
  });
  app.patch("/enrollments/:id/automatic", async (req) => {
    const u = await user(req),
      enabled = z.object({ enabled: z.boolean() }).parse(req.body).enabled;
    await o.db.transaction(async (tx) => {
      const s = await study(tx, (req.params as any).id);
      await active(tx, u.id, s);
      await tx.execute(
        sql`update enrollments set auto_share=${enabled} where user_id=${u.id} and study_id=${s.id}`,
      );
      await audit(tx, u.id, "automatic." + enabled, s.id);
    });
    return { enabled };
  });
  app.get("/studies/:id/window", async (req) => {
    await user(req);
    const s = await study(o.db, (req.params as any).id);
    const start = Date.parse(s.config.startsAt),
      size = s.config.periodDays * 86400000;
    const n = Math.max(0, Math.floor((Date.now() - start) / size));
    return {
      start: new Date(start + n * size).toISOString(),
      end: new Date(
        Math.min(start + (n + 1) * size, Date.parse(s.config.endsAt)),
      ).toISOString(),
    };
  });
  app.post("/submissions", async (req) => {
    const u = await user(req),
      b = submissionSchema.parse(req.body);
    return o.db.transaction(async (tx) => {
      const s = await study(tx, b.studyId);
      const enrollment = await active(tx, u.id, s);
      if (b.mode === "automatic" && !enrollment.auto_share)
        fail(409, "Automatic sharing is disabled");
      if (b.version !== s.version) fail(409, "Consent version changed");
      const start = Date.parse(b.periodStart),
        end = Date.parse(b.periodEnd),
        base = Date.parse(s.config.startsAt),
        size = s.config.periodDays * 86400000;
      const expectedEnd = Math.min(start + size, Date.parse(s.config.endsAt));
      if (
        start < base ||
        start > Date.now() ||
        (start - base) % size !== 0 ||
        end !== expectedEnd
      )
        fail(400, "Invalid activity period");
      const [existing] = await rows(
        tx,
        sql`select * from submissions where user_id=${u.id} and study_id=${s.id} and activity=${b.activity} and period_start=${b.periodStart}`,
      );
      if (existing && existing.status !== "needs_correction")
        return publicSubmission(existing);
      if (b.activity === "health") {
        if (!b.records.length) fail(422, "No data to provide");
        const ids = new Set<string>();
        for (const r of b.records) {
          if (
            !s.config.types.includes(r.type) ||
            Date.parse(r.start) < start ||
            Date.parse(r.end) > end ||
            Date.parse(r.end) > Date.now() + 60000 ||
            Date.parse(r.end) < Date.parse(r.start)
          )
            fail(400, "Data outside authorized scope");
          const key = r.origin + ":" + r.type + ":" + r.id;
          if (ids.has(key)) fail(400, "Duplicate record");
          ids.add(key);
        }
        if (Object.keys(b.answers).length) fail(400, "Unexpected answers");
      } else {
        if (b.records.length) fail(400, "Unexpected health records");
        for (const q of s.config.survey)
          if (!q.options.includes(b.answers[q.id]))
            fail(400, "Complete the survey");
        if (
          !s.config.survey.length ||
          Object.keys(b.answers).some(
            (id) => !s.config.survey.some((q) => q.id === id),
          )
        )
          fail(400, "Unknown survey question");
      }
      const approved =
        s.config.autoApprove &&
        (b.activity === "survey" ||
          b.records.length >= s.config.minimumRecords);
      const points =
        b.activity === "health" ? s.config.points : s.config.surveyPoints;
      const id = existing?.id ?? randomUUID();
      const [saved] = await rows(
        tx,
        sql`insert into submissions(id,user_id,study_id,version,activity,period_start,period_end,status,points,payload) values(${id},${u.id},${s.id},${s.version},${b.activity},${b.periodStart},${b.periodEnd},${approved ? "approved" : "pending"},${points},${v.seal(b)}) on conflict(id) do update set payload=excluded.payload,status=excluded.status,reason=null returning *`,
      );
      if (approved)
        await tx.execute(
          sql`insert into ledger values(${randomUUID()},${u.id},${id},'award',${points},'Verified contribution',now())`,
        );
      return publicSubmission(saved);
    });
  });
  app.get("/submissions", async (req) => {
    const u = await user(req);
    return (
      await rows(
        o.db,
        sql`select * from submissions where user_id=${u.id} order by created_at desc limit 200`,
      )
    ).map(publicSubmission);
  });
  app.get("/submissions/:id", async (req) => {
    const u = await user(req),
      id = uuid.parse((req.params as any).id);
    const [s] = await rows(
      o.db,
      sql`select * from submissions where id=${id} and user_id=${u.id}`,
    );
    if (!s) fail(404, "Submission not found");
    return { ...publicSubmission(s), data: v.open(s.payload) };
  });
  app.get("/points", async (req) => {
    const u = await user(req);
    const [t] = await rows(
      o.db,
      sql`select coalesce(sum(amount),0)::integer as total from ledger where user_id=${u.id}`,
    );
    const [p] = await rows(
      o.db,
      sql`select coalesce(sum(points),0)::integer as pending from submissions where user_id=${u.id} and status='pending'`,
    );
    return {
      ...t,
      ...p,
      entries: await rows(
        o.db,
        sql`select id,submission_id,kind,amount,reason,created_at from ledger where user_id=${u.id} order by created_at desc limit 200`,
      ),
    };
  });
  app.get("/leaderboard", async (req) => {
    const u = await user(req);
    return rows(
      o.db,
      sql`select nickname,total,rank() over(order by total desc)::integer as rank,id=${u.id} as me from(select u.id,u.nickname,coalesce(sum(l.amount),0)::integer as total from users u left join ledger l on l.user_id=u.id where ranking and not deletion_requested group by u.id) t order by total desc,nickname limit 100`,
    );
  });
  app.get("/admin/studies", async (req) => {
    await user(req, true);
    return rows(
      o.db,
      sql`select distinct on(id) * from studies order by id,version desc`,
    );
  });
  app.post("/admin/studies", async (req) => {
    const u = await user(req, true),
      config = studySchema.parse(req.body),
      id = randomUUID();
    await o.db.transaction(async (tx) => {
      await tx.execute(
        sql`insert into studies values(${id},1,'draft',${JSON.stringify(config)}::jsonb)`,
      );
      await audit(tx, u.id, "study.create", id);
    });
    return { id, version: 1, status: "draft", config };
  });
  app.put("/admin/studies/:id", async (req) => {
    const u = await user(req, true),
      config = studySchema.parse(req.body);
    return o.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7843322)`);
      const s = await study(tx, (req.params as any).id, true);
      await tx.execute(
        sql`insert into studies values(${s.id},${s.version + 1},'draft',${JSON.stringify(config)}::jsonb)`,
      );
      await audit(tx, u.id, "study.version", s.id);
      return { id: s.id, version: s.version + 1 };
    });
  });
  app.post("/admin/studies/:id/status", async (req) => {
    const u = await user(req, true),
      b = z
        .object({
          status: z.enum(["published", "closed"]),
          approvalReference: z.string().min(1),
        })
        .parse(req.body);
    await o.db.transaction(async (tx) => {
      const s = await study(tx, (req.params as any).id, true);
      if (o.production && s.config.testOnly)
        fail(400, "Test study cannot be published in production");
      await tx.execute(
        sql`update studies set status=${b.status} where id=${s.id} and version=${s.version}`,
      );
      await audit(
        tx,
        u.id,
        "study." + b.status + ":" + b.approvalReference,
        s.id,
      );
    });
    return { ok: true };
  });
  app.get("/admin/submissions", async (req) => {
    await user(req, true);
    return (
      await rows(
        o.db,
        sql`select * from submissions order by created_at desc limit 200`,
      )
    ).map(publicSubmission);
  });
  app.get("/admin/submissions/:id", async (req) => {
    const u = await user(req, true),
      id = uuid.parse((req.params as any).id);
    const [s] = await rows(o.db, sql`select * from submissions where id=${id}`);
    if (!s) fail(404, "Not found");
    await audit(o.db, u.id, "submission.read", id);
    return { ...publicSubmission(s), data: v.open(s.payload) };
  });
  app.post("/admin/submissions/:id/review", async (req) => {
    const u = await user(req, true),
      id = uuid.parse((req.params as any).id),
      b = z
        .object({
          status: z.enum(["approved", "needs_correction", "rejected"]),
          reason: z.string().min(1).max(500),
        })
        .parse(req.body);
    await o.db.transaction(async (tx) => {
      const [s] = await rows(
        tx,
        sql`select * from submissions where id=${id} for update`,
      );
      if (!s) fail(404, "Not found");
      if (s.status === "approved")
        fail(409, "Use ledger adjustment for an approved submission");
      await tx.execute(
        sql`update submissions set status=${b.status},reason=${b.reason} where id=${id}`,
      );
      if (b.status === "approved")
        await tx.execute(
          sql`insert into ledger values(${randomUUID()},${s.user_id},${id},'award',${s.points},${b.reason},now()) on conflict do nothing`,
        );
      await audit(tx, u.id, "submission." + b.status, id);
    });
    return { ok: true };
  });
  app.post("/admin/points/adjust", async (req) => {
    const u = await user(req, true),
      b = z
        .object({
          userId: uuid,
          amount: z.number().int().min(-10000).max(10000),
          reason: z.string().min(1),
          eventId: uuid,
        })
        .parse(req.body);
    await o.db.transaction(async (tx) => {
      await tx.execute(
        sql`insert into ledger values(${b.eventId},${b.userId},null,'adjustment',${b.amount},${b.reason},now()) on conflict(id) do nothing`,
      );
      await audit(tx, u.id, "points.adjust", b.eventId);
    });
    return { ok: true };
  });
  app.get("/admin/enrollments", async (req) => {
    await user(req, true);
    return rows(
      o.db,
      sql`select user_id,study_id,version,consent_at,withdrawn_at from enrollments order by consent_at desc limit 200`,
    );
  });
  app.get("/admin/deletions", async (req) => {
    await user(req, true);
    return rows(
      o.db,
      sql`select id,nickname from users where deletion_requested`,
    );
  });
  app.post("/admin/deletions/:id", async (req) => {
    const u = await user(req, true),
      id = uuid.parse((req.params as any).id);
    await o.db.transaction(async (tx) => {
      const [target] = await rows(
        tx,
        sql`select * from users where id=${id} and deletion_requested for update`,
      );
      if (!target) fail(404, "No deletion request");
      const holds = await rows(
        tx,
        sql`select s.id from submissions s join studies t on t.id=s.study_id and t.version=s.version where s.user_id=${id} and s.created_at+((t.config->>'retentionDays')::integer*interval '1 day')>now()`,
      );
      if (holds.length) fail(409, "Research retention period has not elapsed");
      await tx.execute(sql`delete from ledger where user_id=${id}`);
      await tx.execute(sql`delete from submissions where user_id=${id}`);
      await tx.execute(sql`delete from enrollments where user_id=${id}`);
      await tx.execute(sql`delete from sessions where user_id=${id}`);
      await tx.execute(sql`delete from users where id=${id}`);
      await audit(tx, u.id, "deletion.complete", id);
    });
    return { ok: true };
  });
  app.post("/admin/exports", async (req) => {
    const u = await user(req, true),
      b = z.object({ studyId: uuid }).parse(req.body);
    await study(o.db, b.studyId);
    const id = randomUUID();
    await o.db.execute(
      sql`insert into exports values(${id},${u.id},${b.studyId},now()+interval '10 minutes')`,
    );
    await audit(o.db, u.id, "export.create", b.studyId);
    return { id, download: "/admin/exports/" + id };
  });
  app.get("/admin/exports/:id", async (req) => {
    const u = await user(req, true),
      id = uuid.parse((req.params as any).id);
    const [e] = await rows(
      o.db,
      sql`select * from exports where id=${id} and actor=${u.id} and expires_at>now()`,
    );
    if (!e) fail(404, "Export expired");
    const data = await rows(
      o.db,
      sql`select s.* from submissions s join enrollments n on n.user_id=s.user_id and n.study_id=s.study_id and n.version=s.version join users u on u.id=s.user_id where s.study_id=${e.study_id} and s.status='approved' and n.withdrawn_at is null and not u.deletion_requested`,
    );
    await audit(o.db, u.id, "export.download", id);
    return data.map((s) => ({
      participant: createHmac("sha256", o.key)
        .update(s.study_id + ":" + s.user_id)
        .digest("hex"),
      version: s.version,
      data: v.open(s.payload),
    }));
  });
  return app;
}
