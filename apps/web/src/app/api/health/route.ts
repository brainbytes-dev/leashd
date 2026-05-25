import { NextResponse } from "next/server";
import { getDb, sql } from "@repo/db";
import { DEMO_MODE } from "@/lib/demo-mode";

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({
      status: "healthy",
      checks: { database: "demo_mode", env: process.env.NODE_ENV || "unknown", timestamp: new Date().toISOString() },
    });
  }
  const checks: Record<string, string> = {};

  // Database check: ping the Drizzle/Neon connection directly.
  try {
    await getDb().execute(sql`select 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  checks.env = process.env.NODE_ENV || "unknown";
  checks.timestamp = new Date().toISOString();

  const allOk = checks.database === "ok";

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
