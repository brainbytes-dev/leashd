import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Users ──────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name"),
  image: text("image"),
  role: text("role").default("user").notNull(), // user, admin
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better-Auth: Sessions ──────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better-Auth: Accounts ──────────────────────────────────────────
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better-Auth: Verifications ─────────────────────────────────────
export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Subscriptions (Stripe) ────────────────────────────────────
export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    email: text("email"),
    status: text("status").default("inactive").notNull(),
    planId: text("plan_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    canceledAt: timestamp("canceled_at"),
  },
  (table) => [
    index("idx_user_subscriptions_status").on(table.status),
    index("idx_user_subscriptions_user_id").on(table.userId),
  ]
);

// ─── Payments (Stripe) ─────────────────────────────────────────────
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").references(
      () => userSubscriptions.stripeSubscriptionId
    ),
    amount: bigint("amount", { mode: "number" }),
    currency: text("currency").default("usd"),
    status: text("status").default("pending").notNull(),
    paidAt: timestamp("paid_at"),
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_payments_subscription").on(table.stripeSubscriptionId),
    index("idx_payments_status").on(table.status),
    index("idx_payments_user_id").on(table.userId),
  ]
);

// ─── Mobile Subscriptions (RevenueCat) ──────────────────────────────
export const mobileSubscriptions = pgTable(
  "mobile_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revenuecatUserId: text("revenuecat_user_id").notNull().unique(),
    productId: text("product_id").notNull(),
    store: text("store").default("apple"), // apple, google, stripe
    status: text("status").default("active").notNull(),
    autoResumeDate: timestamp("auto_resume_date"),
    expirationDate: timestamp("expiration_date"),
    purchaseDate: timestamp("purchase_date"),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_mobile_subscriptions_status").on(table.status),
    index("idx_mobile_subscriptions_store").on(table.store),
  ]
);

// ─── Mobile Payments (RevenueCat) ───────────────────────────────────
export const mobilePayments = pgTable(
  "mobile_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revenuecatUserId: text("revenuecat_user_id")
      .notNull()
      .references(() => mobileSubscriptions.revenuecatUserId),
    transactionId: text("transaction_id").unique(),
    productId: text("product_id").notNull(),
    amount: bigint("amount", { mode: "number" }),
    currency: text("currency").default("usd"),
    store: text("store"),
    status: text("status").default("completed").notNull(),
    receiptData: jsonb("receipt_data"),
    purchasedAt: timestamp("purchased_at"),
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_mobile_payments_subscription").on(table.revenuecatUserId),
    index("idx_mobile_payments_status").on(table.status),
  ]
);

// ─── Leash: Workspaces ──────────────────────────────────────────────
export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    plan: text("plan").default("free").notNull(), // free, pro, team
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_workspaces_owner").on(table.ownerId)]
);

// ─── Leash: Workspace Members ───────────────────────────────────────
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(), // owner, admin, member
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_workspace_member").on(table.workspaceId, table.userId),
    index("idx_workspace_members_ws").on(table.workspaceId),
  ]
);

// ─── Leash: Agents ──────────────────────────────────────────────────
// A governed AI agent identity. NOT a wallet — governance metadata only.
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    label: text("label"), // human-friendly description
    // Hashed enrollment token leashd uses to authenticate this agent locally.
    tokenHash: text("token_hash").notNull(),
    status: text("status").default("active").notNull(), // active, paused, revoked
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_agents_ws").on(table.workspaceId)]
);

// ─── Leash: Policies ────────────────────────────────────────────────
// Signed policy document distributed to leashd. `spec` validated by
// the PolicySpec zod schema in @repo/leash-core.
export const policies = pgTable(
  "policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "cascade",
    }), // null = workspace-default policy
    name: text("name").notNull(),
    version: bigint("version", { mode: "number" }).default(1).notNull(),
    spec: jsonb("spec").notNull(), // PolicySpec
    signature: text("signature"), // control-plane signature; leashd verifies
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_policies_ws").on(table.workspaceId),
    index("idx_policies_agent").on(table.agentId),
  ]
);

// ─── Leash: Rail Bindings ───────────────────────────────────────────
// Config references for connected payment rails. NEVER stores secrets —
// secrets (NWC strings, macaroons, keys) live only in leashd, encrypted.
export const railBindings = pgTable(
  "rail_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    rail: text("rail").notNull(), // lightning_nwc, cashu, x402
    label: text("label").notNull(),
    // Non-secret metadata only (e.g. node alias, mint URL host, last 4 of pubkey).
    meta: jsonb("meta"),
    status: text("status").default("connected").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_rail_bindings_ws").on(table.workspaceId)]
);

// ─── Leash: Audit Events ────────────────────────────────────────────
// Aggregated, append-only payment-governance events pushed from leashd.
// Log of record is local in leashd; this is the read-only aggregate view.
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    seq: bigint("seq", { mode: "number" }).notNull(), // per-agent monotonic
    decision: text("decision").notNull(), // allowed, denied, capped, approval_required
    rail: text("rail"),
    endpoint: text("endpoint"),
    amountMsat: bigint("amount_msat", { mode: "number" }), // sats rails
    amountMinor: bigint("amount_minor", { mode: "number" }), // stablecoin minor units
    currency: text("currency"),
    reason: text("reason"),
    policyVersion: bigint("policy_version", { mode: "number" }),
    signature: text("signature").notNull(), // leashd signature over the event
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_ws").on(table.workspaceId),
    index("idx_audit_agent").on(table.agentId),
    index("idx_audit_decision").on(table.decision),
    uniqueIndex("uq_audit_agent_seq").on(table.agentId, table.seq),
  ]
);

// ─── Type Exports ───────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type MobileSubscription = typeof mobileSubscriptions.$inferSelect;
export type NewMobileSubscription = typeof mobileSubscriptions.$inferInsert;
export type MobilePayment = typeof mobilePayments.$inferSelect;
export type NewMobilePayment = typeof mobilePayments.$inferInsert;

// ─── Leash type exports ─────────────────────────────────────────────
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;
export type RailBinding = typeof railBindings.$inferSelect;
export type NewRailBinding = typeof railBindings.$inferInsert;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
