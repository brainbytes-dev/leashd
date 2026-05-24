#!/usr/bin/env node
// Create a Leash workspace for an existing user (by email) + owner membership.
// Usage:  DATABASE_URL=... node scripts/create-workspace.mjs <email> [workspaceName]
import postgres from "postgres";

const email = process.argv[2];
const wsName = process.argv[3];
if (!email) {
  console.error("usage: node scripts/create-workspace.mjs <email> [name]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const [user] = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
  if (!user) {
    console.error(`No user with email ${email}. Sign up first.`);
    process.exit(2);
  }

  const existing = await sql`
    SELECT w.id, w.slug FROM workspaces w
    JOIN workspace_members m ON m.workspace_id = w.id
    WHERE m.user_id = ${user.id}`;
  if (existing.length) {
    console.log(`User already has workspace: ${existing[0].slug} (${existing[0].id})`);
    process.exit(0);
  }

  const base = (user.name || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  let slug = `${base}-workspace`;
  const clash = await sql`SELECT 1 FROM workspaces WHERE slug = ${slug}`;
  if (clash.length) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const name = wsName || `${user.name || "Henrik"}'s Workspace`;
  const [ws] = await sql`
    INSERT INTO workspaces (owner_id, name, slug, plan)
    VALUES (${user.id}, ${name}, ${slug}, 'free')
    RETURNING id, name, slug`;
  await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${ws.id}, ${user.id}, 'owner')`;

  console.log(`Created workspace "${ws.name}" slug=${ws.slug} id=${ws.id} for ${email}`);
} finally {
  await sql.end();
}
