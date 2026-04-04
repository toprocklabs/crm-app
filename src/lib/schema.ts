import {
  date,
  integer,
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
  "linkedin",
  "task",
]);

export const taskStatus = pgEnum("task_status", ["open", "done"]);

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
  website: text("website"),
  customerProjectUrl: text("customer_project_url"),
  industry: text("industry"),
  nextStep: text("next_step").notNull().default(""),
  nextStepDueDate: date("next_step_due_date"),
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

export type DealStage = (typeof dealStage.enumValues)[number];
export type ActivityType = (typeof activityType.enumValues)[number];
