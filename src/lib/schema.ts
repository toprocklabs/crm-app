import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const dealStage = pgEnum("deal_stage", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const activityType = pgEnum("activity_type", [
  "note",
  "call",
  "meeting",
  "email",
  "instagram",
  "linkedin",
  "task",
]);

export const accountStage = pgEnum("account_stage", [
  "new_lead",
  "attempting_to_engage",
  "engaged",
  "in_pipeline",
  "customer",
  "closed_lost",
]);

export const taskStatus = pgEnum("task_status", ["open", "done"]);

// Typed relationship edges — the graph that powers warm-path discovery.
export const edgeType = pgEnum("edge_type", [
  "referred_by", // the gold: who sent us this client
  "colocated_with", // same plaza/building/street — the Scuba Riverton play
  "introduced_by", // a person bridged us to another person/company
  "knows", // soft personal tie
  "vendor_of",
  "customer_of",
  "partner_of",
  "competitor_of",
]);

// Polymorphic node type for graph edges and enrichment.
export const entityType = pgEnum("entity_type", ["company", "contact"]);

// Lifecycle of an agent-proposed write in the human-in-the-loop queue.
export const suggestionStatus = pgEnum("suggestion_status", [
  "pending",
  "approved",
  "rejected",
  "auto_applied",
]);

// Where a piece of data originated (manual entry vs. an ingestion source).
export const dataSource = pgEnum("data_source", [
  "manual",
  "drive",
  "gmail",
  "agent",
]);

// Lifecycle of a client-facing proposal / statement of work.
export const proposalStatus = pgEnum("proposal_status", [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "superseded",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
  ],
);

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stage: accountStage("stage").default("new_lead").notNull(),
  website: text("website"),
  customerProjectUrl: text("customer_project_url"),
  industry: text("industry"),
  nextStep: text("next_step").notNull().default(""),
  nextStepDueDate: date("next_step_due_date"),
  // Address + geocode power the proximity ("plaza neighbors") play.
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  plazaKey: text("plaza_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    linkedinProfileUrl: text("linkedin_profile_url"),
    title: text("title"),
    companyId: integer("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("contacts_email_unique").on(table.email),
  ],
);

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stage: dealStage("stage").default("lead").notNull(),
  valueCents: integer("value_cents").default(0).notNull(),
  implementationCostCents: integer("implementation_cost_cents").default(0).notNull(),
  ownerName: text("owner_name"),
  nextStep: text("next_step").notNull().default(""),
  nextStepDueDate: date("next_step_due_date"),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  primaryContactId: integer("primary_contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  expectedCloseDate: date("expected_close_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: activityType("type").default("note").notNull(),
  notes: text("notes").notNull(),
  loggedByUserId: integer("logged_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  contactId: integer("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  dealId: integer("deal_id").references(() => deals.id, {
    onDelete: "set null",
  }),
  // Distinguishes human-logged activity from agent-logged activity.
  source: dataSource("source").default("manual").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
});

export const salesTasks = pgTable("sales_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: taskStatus("status").default("open").notNull(),
  dueDate: date("due_date").notNull(),
  assignedTo: text("assigned_to"),
  dealId: integer("deal_id").references(() => deals.id, {
    onDelete: "set null",
  }),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// The graph. One polymorphic edge table: any node -> any node, typed + weighted.
// strength (0-100) decays over time without contact; evidence cites the source.
export const relationships = pgTable(
  "relationships",
  {
    id: serial("id").primaryKey(),
    fromType: entityType("from_type").notNull(),
    fromId: integer("from_id").notNull(),
    toType: entityType("to_type").notNull(),
    toId: integer("to_id").notNull(),
    edgeType: edgeType("edge_type").notNull(),
    strength: integer("strength").default(50).notNull(),
    evidence: text("evidence"),
    source: dataSource("source").default("manual").notNull(),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("relationships_from_idx").on(table.fromType, table.fromId),
    index("relationships_to_idx").on(table.toType, table.toId),
    uniqueIndex("relationships_unique_edge").on(
      table.fromType,
      table.fromId,
      table.toType,
      table.toId,
      table.edgeType,
    ),
  ],
);

// Human-in-the-loop gate: agents write proposals here, never to core tables.
// payload is the exact write to apply on approval.
export const suggestions = pgTable(
  "suggestions",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // 'new_contact' | 'new_edge' | 'log_activity' | 'stage_change'
    title: text("title").notNull(), // short human summary for the inbox row
    payload: jsonb("payload").notNull(),
    confidence: integer("confidence").default(0).notNull(), // 0-100 from triage
    evidence: text("evidence"),
    source: dataSource("source").default("agent").notNull(),
    status: suggestionStatus("status").default("pending").notNull(),
    autoApplied: boolean("auto_applied").default(false).notNull(),
    agentRunId: integer("agent_run_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("suggestions_status_idx").on(table.status)],
);

// Audit + token accounting for every standing-loop execution. Keeps autonomy
// honest, debuggable, and budget-bounded.
export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  loop: text("loop").notNull(), // 'ingest_drive' | 'ingest_gmail' | 'daily_brief' | 'sourcing'
  model: text("model"),
  status: text("status").default("running").notNull(), // running | ok | error | halted_budget
  tokensIn: integer("tokens_in").default(0).notNull(),
  tokensOut: integer("tokens_out").default(0).notNull(),
  costCents: integer("cost_cents").default(0).notNull(),
  itemsSeen: integer("items_seen").default(0).notNull(),
  itemsProposed: integer("items_proposed").default(0).notNull(),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// Client-facing proposals / statements of work, served at /p/[slug].
// Content stays the four-section markdown from the old proposal_creator repo
// (Overview / Pricing table / What's Included / Notes). The signed PDF is
// produced client-side at signing time and stored base64 (tiny volume; avoids
// bytea quirks over the neon-http driver).
export const proposals = pgTable(
  "proposals",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    dealId: integer("deal_id").references(() => deals.id, { onDelete: "set null" }),
    contactId: integer("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    pin: text("pin").notNull(),
    status: proposalStatus("status").default("draft").notNull(),
    clientName: text("client_name").notNull().default(""),
    business: text("business").notNull().default(""),
    // Display date shown in the header, e.g. "April 11, 2026" (old frontmatter `date`).
    proposalDate: text("proposal_date").notNull().default(""),
    contentMd: text("content_md").notNull().default(""),
    signedPdfBase64: text("signed_pdf_base64"),
    signerName: text("signer_name"),
    signerEmail: text("signer_email"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("proposals_slug_unique").on(table.slug),
    index("proposals_company_idx").on(table.companyId),
    index("proposals_status_idx").on(table.status),
  ],
);

// Geocode + cluster cache so we don't re-hit the geocoding API every render.
export const placeEnrichment = pgTable(
  "place_enrichment",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    formattedAddress: text("formatted_address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    plazaKey: text("plaza_key"), // shared key for businesses in the same plaza/block
    provider: text("provider"), // 'google' | 'mapbox' | 'nominatim'
    geocodedAt: timestamp("geocoded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("place_enrichment_company_unique").on(table.companyId),
    index("place_enrichment_plaza_idx").on(table.plazaKey),
  ],
);

export type DealStage = (typeof dealStage.enumValues)[number];
export type ActivityType = (typeof activityType.enumValues)[number];
export type AccountStage = (typeof accountStage.enumValues)[number];
export type EdgeType = (typeof edgeType.enumValues)[number];
export type EntityType = (typeof entityType.enumValues)[number];
export type DataSource = (typeof dataSource.enumValues)[number];
export type SuggestionStatus = (typeof suggestionStatus.enumValues)[number];
export type ProposalStatus = (typeof proposalStatus.enumValues)[number];
