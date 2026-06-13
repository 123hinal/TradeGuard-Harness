import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

interface CliArgs {
  url?: string;
  anon?: string;
  service?: string;
  dbPassword?: string;
  databaseUrl?: string;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--url=")) args.url = arg.slice(6);
    if (arg.startsWith("--anon=")) args.anon = arg.slice(7);
    if (arg.startsWith("--service=")) args.service = arg.slice(10);
    if (arg.startsWith("--db-password=")) args.dbPassword = arg.slice(14);
    if (arg.startsWith("--database-url=")) args.databaseUrl = arg.slice(15);
  }

  return args;
}

function upsertEnvValue(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  return `${content.trimEnd()}\n${line}\n`;
}

function main() {
  const args = parseArgs();
  const envPath = resolve(process.cwd(), ".env.local");
  const examplePath = resolve(process.cwd(), ".env.example");

  const required = ["url", "anon", "service"] as const;
  const missing = required.filter((key) => !args[key]);

  if (missing.length > 0) {
    console.error("Usage:");
    console.error('  npm run supabase:configure -- --url="https://xxx.supabase.co" --anon="eyJ..." --service="eyJ..." --db-password="your-password"');
    console.error("");
    console.error("See SUPABASE_SETUP.md for step-by-step instructions.");
    process.exit(1);
  }

  if (!args.dbPassword && !args.databaseUrl) {
    console.error("Provide --db-password=... or --database-url=... for migrations.");
    process.exit(1);
  }

  let content = existsSync(envPath)
    ? readFileSync(envPath, "utf-8")
    : readFileSync(examplePath, "utf-8");

  content = upsertEnvValue(content, "NEXT_PUBLIC_SUPABASE_URL", args.url!);
  content = upsertEnvValue(content, "NEXT_PUBLIC_SUPABASE_ANON_KEY", args.anon!);
  content = upsertEnvValue(content, "SUPABASE_SERVICE_ROLE_KEY", args.service!);
  content = upsertEnvValue(content, "AGENT_PROVIDER", "mock");

  if (args.dbPassword) {
    content = upsertEnvValue(content, "SUPABASE_DB_PASSWORD", args.dbPassword);
  }

  if (args.databaseUrl) {
    content = upsertEnvValue(content, "DATABASE_URL", args.databaseUrl);
  }

  writeFileSync(envPath, content, "utf-8");

  console.log(`Wrote Supabase credentials to ${envPath}`);
  console.log("Next: npm run db:migrate");
}

main();
