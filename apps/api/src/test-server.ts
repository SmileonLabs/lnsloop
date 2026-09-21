// Explicit local integration environment. Never launched by the production entrypoint.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { randomBytes } from "node:crypto";
import { migrate } from "./db.js";
import { buildApp } from "./app.js";
if (process.env.NODE_ENV === "production")
  throw new Error("Test server prohibited in production");
const database = new PGlite(),
  db = drizzle(database);
await migrate(db);
const app = await buildApp({
  db,
  key: randomBytes(32).toString("base64"),
  testAuth: true,
  adminSubjects: ["test:operator"],
  origin: process.env.TEST_ORIGINS ?? "http://localhost:5173",
});
await app.listen({ port: 4000, host: "127.0.0.1" });
console.log("LOCAL TEST SERVER: volatile synthetic data only, port 4000");
process.on("SIGTERM", async () => {
  await app.close();
  await database.close();
});
