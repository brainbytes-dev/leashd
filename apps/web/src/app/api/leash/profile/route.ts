import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, users } from "@repo/db";
import { err, getSessionUser } from "@/lib/leash/api";
import { isValidTz } from "@/lib/timezones";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const db = getDb();
  const rows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return NextResponse.json({ timezone: rows[0]?.timezone ?? "UTC" });
}

const PatchBody = z.object({ timezone: z.string().min(1).max(64) });

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidTz(parsed.data.timezone))
    return err(400, "Invalid timezone");

  const db = getDb();
  await db
    .update(users)
    .set({ timezone: parsed.data.timezone, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return NextResponse.json({ timezone: parsed.data.timezone });
}
