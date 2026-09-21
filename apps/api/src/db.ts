import { sql } from "drizzle-orm";
export interface Database {
  execute(query: ReturnType<typeof sql>): Promise<any>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
}
export async function rows(
  db: Database,
  query: ReturnType<typeof sql>,
): Promise<any[]> {
  const r = await db.execute(query);
  return r.rows ?? r;
}
export async function migrate(db: Database) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(7843321)`);
    await tx.execute(
      sql`create table if not exists users (id uuid primary key, subject text unique not null, email text not null, nickname text not null, role text not null default 'participant', language text not null default 'en', ranking boolean not null default false, deletion_requested boolean not null default false)`,
    );
    await tx.execute(
      sql`create table if not exists sessions (hash text primary key,user_id uuid not null references users(id),expires_at timestamptz not null)`,
    );
    await tx.execute(
      sql`create table if not exists studies (id uuid not null,version integer not null,status text not null,config jsonb not null,primary key(id,version))`,
    );
    await tx.execute(
      sql`create table if not exists enrollments (user_id uuid references users(id),study_id uuid not null,version integer not null,consent_at timestamptz not null default now(),withdrawn_at timestamptz,auto_share boolean not null default false,answers text not null,primary key(user_id,study_id),foreign key(study_id,version) references studies(id,version))`,
    );
    await tx.execute(
      sql`create table if not exists submissions (id uuid primary key,user_id uuid references users(id),study_id uuid not null,version integer not null,activity text not null,period_start timestamptz not null,period_end timestamptz not null,status text not null,points integer not null,payload text not null,reason text,created_at timestamptz not null default now(),unique(user_id,study_id,activity,period_start),foreign key(study_id,version) references studies(id,version))`,
    );
    await tx.execute(
      sql`create table if not exists ledger (id uuid primary key,user_id uuid references users(id),submission_id uuid references submissions(id),kind text not null,amount integer not null,reason text not null,created_at timestamptz not null default now())`,
    );
    await tx.execute(
      sql`create unique index if not exists one_award on ledger(submission_id) where kind='award'`,
    );
    await tx.execute(
      sql`create table if not exists audit (id uuid primary key,actor uuid,action text not null,target text not null,created_at timestamptz not null default now())`,
    );
    await tx.execute(
      sql`create table if not exists exports (id uuid primary key,actor uuid not null,study_id uuid not null,expires_at timestamptz not null)`,
    );
  });
}
