import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "./db.js";
import { buildApp } from "./app.js";
if (!process.env.DATABASE_URL || !process.env.DATA_KEY)
  throw new Error("Configure DATABASE_URL and DATA_KEY. See .env.example.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
await migrate(db);
const app = await buildApp({
  db,
  key: process.env.DATA_KEY,
  production: process.env.NODE_ENV === "production",
  testAuth: process.env.ENABLE_TEST_AUTH === "true",
  googleAudience: process.env.GOOGLE_CLIENT_IDS,
  adminSubjects: process.env.ADMIN_GOOGLE_SUBJECTS?.split(","),
  origin: process.env.ADMIN_ORIGIN,
});
await app.listen({
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
});
app.addHook("onClose", async () => {
  await pool.end();
});
process.on("SIGTERM", () => void app.close());
