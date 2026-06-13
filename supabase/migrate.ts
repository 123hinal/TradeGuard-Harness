import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const POOLER_REGIONS = [
  "us-east-1",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-south-1",
  "sa-east-1",
  "ca-central-1",
];

function extractProjectRef(supabaseUrl: string): string {
  const parsed = new URL(supabaseUrl);

  const dashboardMatch = parsed.pathname.match(/\/project\/([^/]+)/);
  if (dashboardMatch?.[1]) {
    return dashboardMatch[1];
  }

  if (parsed.hostname.endsWith(".supabase.co")) {
    return parsed.hostname.split(".")[0];
  }

  throw new Error(
    "Invalid NEXT_PUBLIC_SUPABASE_URL. Use https://<project-ref>.supabase.co from Project Settings → API"
  );
}

function buildDirectDatabaseUrl(projectRef: string, password: string): string {
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}

function buildPoolerDatabaseUrl(
  projectRef: string,
  password: string,
  region: string,
  port: 5432 | 6543,
  mode: "reference-option" | "scoped-user"
): string {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const encodedPassword = encodeURIComponent(password);

  if (mode === "scoped-user") {
    return `postgresql://postgres.${projectRef}:${encodedPassword}@${host}:${port}/postgres`;
  }

  return `postgresql://postgres:${encodedPassword}@${host}:${port}/postgres?options=reference%3D${projectRef}`;
}

async function connectAndMigrate(databaseUrl: string, sql: string, label: string): Promise<void> {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`Migration applied successfully via ${label}.`);
  } finally {
    await client.end();
  }
}

async function migrate() {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/001_initial_schema.sql"
  );
  const sql = readFileSync(migrationPath, "utf-8");

  console.log("TradeGuard — Running Supabase migration");
  console.log(`Migration: ${migrationPath}`);

  if (process.env.DATABASE_URL) {
    await connectAndMigrate(process.env.DATABASE_URL, sql, "DATABASE_URL");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!url || !password || url.includes("your-project")) {
    throw new Error(
      "Missing database connection. Set DATABASE_URL (recommended) or both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD in .env.local"
    );
  }

  const projectRef = extractProjectRef(url);
  const attempts: Array<{ url: string; label: string }> = [
    {
      url: buildDirectDatabaseUrl(projectRef, password),
      label: "direct connection (IPv6)",
    },
  ];

  for (const region of POOLER_REGIONS) {
    for (const port of [5432, 6543] as const) {
      for (const mode of ["reference-option", "scoped-user"] as const) {
        attempts.push({
          url: buildPoolerDatabaseUrl(projectRef, password, region, port, mode),
          label: `pooler ${mode} ${region}:${port}`,
        });
      }
    }
  }

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      await connectAndMigrate(attempt.url, sql, attempt.label);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${attempt.label}: ${message.split("\n")[0]}`);
    }
  }

  throw new Error(
    [
      "Could not connect to Supabase Postgres from this network.",
      "Copy the Session pooler URI from Supabase → Connect → DATABASE_URL in .env.local, then rerun.",
      "",
      ...errors.slice(0, 5),
    ].join("\n")
  );
}

migrate().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
