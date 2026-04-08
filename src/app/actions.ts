"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { accountStageOptions } from "@/lib/account-stage";
import { getDb } from "@/lib/db";
import { companyIndustries } from "@/lib/company-industries";
import { normalizeCompanyIndustry } from "@/lib/company-industry-utils";
import { activities, companies, contacts, deals, salesTasks, users } from "@/lib/schema";

const optionalCompanyIndustrySchema = z.enum(companyIndustries).optional().or(z.literal(""));
const accountStageSchema = z.enum(accountStageOptions);

const companySchema = z.object({
  name: z.string().trim().min(2),
  stage: accountStageSchema,
  website: z.string().trim().optional(),
  customerProjectUrl: z.string().trim().optional(),
  industry: optionalCompanyIndustrySchema,
  nextStep: z.string().trim().optional(),
  nextStepDueDate: z.string().optional(),
});

const contactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  linkedinProfileUrl: z.string().trim().optional(),
  title: z.string().trim().optional(),
  companyId: z.coerce.number().int().positive().optional(),
});

const dealSchema = z.object({
  name: z.string().trim().min(2),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
  iarrUsd: z.coerce.number().min(0),
  implementationCostUsd: z.coerce.number().min(0),
  ownerName: z.string().trim().optional(),
  nextStep: z.string().trim().min(2),
  nextStepDueDate: z.string().optional(),
  companyId: z.coerce.number().int().positive().optional(),
  expectedCloseDate: z.string().optional(),
});

const dealUpdateSchema = z.object({
  dealId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2),
  iarrUsd: z.coerce.number().min(0),
  implementationCostUsd: z.coerce.number().min(0),
  ownerName: z.string().trim().optional(),
  nextStep: z.string().trim().min(2),
  nextStepDueDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  companyId: z.coerce.number().int().positive().optional(),
  primaryContactId: z.coerce.number().int().positive().optional(),
});

const dealStageUpdateSchema = z.object({
  dealId: z.coerce.number().int().positive(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
  reason: z.string().trim().optional(),
});

const taskSchema = z.object({
  title: z.string().trim().min(2),
  dueDate: z.string().min(4),
  assignedTo: z.string().trim().optional(),
  dealId: z.coerce.number().int().positive().optional(),
  companyId: z.coerce.number().int().positive().optional(),
});

const activitySchema = z.object({
  type: z.enum(["note", "call", "meeting", "email", "instagram", "linkedin", "task"]),
  notes: z.string().trim().min(2),
  dealId: z.coerce.number().int().positive().optional(),
  contactId: z.coerce.number().int().positive().optional(),
  companyId: z.coerce.number().int().positive().optional(),
  occurredOn: z.string().optional(),
  returnPath: z.string().optional(),
});

const activityDateUpdateSchema = z.object({
  activityId: z.coerce.number().int().positive(),
  occurredOn: z.string().min(4),
  returnPath: z.string().optional(),
});

const contactFieldUpdateSchema = z.object({
  contactId: z.coerce.number().int().positive(),
  field: z.enum(["title", "email", "phone", "linkedinProfileUrl"]),
  value: z.string().optional(),
  returnPath: z.string().optional(),
});

const companyFieldUpdateSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  field: z.enum(["stage", "website", "customerProjectUrl", "industry", "nextStep", "nextStepDueDate"]),
  value: z.string().optional(),
});

function cleanOptionalText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function normalizeUsPhone(value: string | undefined) {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) {
    return null;
  }

  const digits = cleaned.replace(/\D/g, "");
  const tenDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (!/^\d{10}$/.test(tenDigits)) {
    throw new Error("Phone number must have 10 digits (US format).");
  }

  return `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

function mergeDateWithTime(dateValue: string | undefined, baseDate: Date | null = new Date()) {
  const cleaned = cleanOptionalText(dateValue);

  if (!cleaned) {
    return null;
  }

  const resolvedBaseDate = baseDate ?? new Date();

  const [year, month, day] = cleaned.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Activity date must be a valid date.");
  }

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      resolvedBaseDate.getUTCHours(),
      resolvedBaseDate.getUTCMinutes(),
      resolvedBaseDate.getUTCSeconds(),
      resolvedBaseDate.getUTCMilliseconds(),
    ),
  );
}

export async function createCompany(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = companySchema.parse({
    name: formData.get("name"),
    stage: formData.get("stage"),
    website: formData.get("website"),
    customerProjectUrl: formData.get("customerProjectUrl"),
    industry: formData.get("industry"),
    nextStep: formData.get("nextStep"),
    nextStepDueDate: formData.get("nextStepDueDate"),
  });

  await db.insert(companies).values({
    name: parsed.name,
    stage: parsed.stage,
    website: normalizeUrl(cleanOptionalText(parsed.website)),
    customerProjectUrl: normalizeUrl(cleanOptionalText(parsed.customerProjectUrl)),
    industry: normalizeCompanyIndustry(parsed.industry),
    nextStep: cleanOptionalText(parsed.nextStep) ?? "",
    nextStepDueDate: cleanOptionalText(parsed.nextStepDueDate),
  });

  revalidatePath("/");
}

export async function createContact(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const rawCompanyId = formData.get("companyId")?.toString();

  const parsed = contactSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    linkedinProfileUrl: formData.get("linkedinProfileUrl"),
    title: formData.get("title"),
    companyId: rawCompanyId ? Number(rawCompanyId) : undefined,
  });

  await db.insert(contacts).values({
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email: cleanOptionalText(parsed.email),
    phone: normalizeUsPhone(parsed.phone),
    linkedinProfileUrl: normalizeUrl(cleanOptionalText(parsed.linkedinProfileUrl)),
    title: cleanOptionalText(parsed.title),
    companyId: parsed.companyId ?? null,
  });

  revalidatePath("/");
  revalidatePath("/contacts");
}

export async function updateContactField(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = contactFieldUpdateSchema.parse({
    contactId: formData.get("contactId"),
    field: formData.get("field"),
    value: formData.get("value"),
    returnPath: formData.get("returnPath"),
  });

  const cleaned = cleanOptionalText(parsed.value);

  if (parsed.field === "email" && cleaned) {
    z.string().email().parse(cleaned);
  }

  if (parsed.field === "title") {
    await db.update(contacts).set({ title: cleaned }).where(eq(contacts.id, parsed.contactId));
  }

  if (parsed.field === "email") {
    await db.update(contacts).set({ email: cleaned }).where(eq(contacts.id, parsed.contactId));
  }

  if (parsed.field === "phone") {
    await db.update(contacts).set({ phone: normalizeUsPhone(parsed.value) }).where(eq(contacts.id, parsed.contactId));
  }

  if (parsed.field === "linkedinProfileUrl") {
    await db
      .update(contacts)
      .set({ linkedinProfileUrl: normalizeUrl(cleanOptionalText(parsed.value)) })
      .where(eq(contacts.id, parsed.contactId));
  }

  revalidatePath(`/contacts/${parsed.contactId}`);
  revalidatePath("/contacts");
  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
}

export async function updateCompanyField(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = companyFieldUpdateSchema.parse({
    companyId: formData.get("companyId"),
    field: formData.get("field"),
    value: formData.get("value"),
  });

  const cleaned = cleanOptionalText(parsed.value);

  const normalizedUrl = normalizeUrl(cleaned);

  if ((parsed.field === "customerProjectUrl" || parsed.field === "website") && normalizedUrl) {
    z.string().url().parse(normalizedUrl);
  }

  if (parsed.field === "industry") {
    optionalCompanyIndustrySchema.parse(parsed.value ?? "");
  }

  if (parsed.field === "stage") {
    accountStageSchema.parse(parsed.value);
  }

  if (parsed.field === "nextStepDueDate" && cleaned) {
    z.string().date().parse(cleaned);
  }

  const stageValue = parsed.field === "stage" ? accountStageSchema.parse(parsed.value) : undefined;

  await db
    .update(companies)
    .set({
      stage: stageValue,
      website: parsed.field === "website" ? normalizedUrl : undefined,
      customerProjectUrl: parsed.field === "customerProjectUrl" ? normalizedUrl : undefined,
      industry: parsed.field === "industry" ? normalizeCompanyIndustry(parsed.value) : undefined,
      nextStep: parsed.field === "nextStep" ? cleaned ?? "" : undefined,
      nextStepDueDate: parsed.field === "nextStepDueDate" ? cleaned : undefined,
    })
    .where(eq(companies.id, parsed.companyId));

  revalidatePath(`/accounts/${parsed.companyId}`);
  revalidatePath("/accounts");
}

export async function createDeal(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const rawCompanyId = formData.get("companyId")?.toString();

  const parsed = dealSchema.parse({
    name: formData.get("name"),
    stage: formData.get("stage"),
    iarrUsd: formData.get("iarrUsd"),
    implementationCostUsd: formData.get("implementationCostUsd"),
    ownerName: formData.get("ownerName"),
    nextStep: formData.get("nextStep"),
    nextStepDueDate: formData.get("nextStepDueDate"),
    companyId: rawCompanyId ? Number(rawCompanyId) : undefined,
    expectedCloseDate: formData.get("expectedCloseDate"),
  });

  await db.insert(deals).values({
    name: parsed.name,
    stage: parsed.stage,
    valueCents: Math.round(parsed.iarrUsd * 100),
    implementationCostCents: Math.round(parsed.implementationCostUsd * 100),
    ownerName: cleanOptionalText(parsed.ownerName),
    nextStep: parsed.nextStep,
    nextStepDueDate: cleanOptionalText(parsed.nextStepDueDate),
    companyId: parsed.companyId ?? null,
    expectedCloseDate: cleanOptionalText(parsed.expectedCloseDate),
  });

  revalidatePath("/");
  revalidatePath("/opportunities");
}

export async function updateDeal(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const rawCompanyId = formData.get("companyId")?.toString();
  const rawPrimaryContactId = formData.get("primaryContactId")?.toString();

  const parsed = dealUpdateSchema.parse({
    dealId: formData.get("dealId"),
    name: formData.get("name"),
    iarrUsd: formData.get("iarrUsd"),
    implementationCostUsd: formData.get("implementationCostUsd"),
    ownerName: formData.get("ownerName"),
    nextStep: formData.get("nextStep"),
    nextStepDueDate: formData.get("nextStepDueDate"),
    expectedCloseDate: formData.get("expectedCloseDate"),
    companyId: rawCompanyId ? Number(rawCompanyId) : undefined,
    primaryContactId: rawPrimaryContactId ? Number(rawPrimaryContactId) : undefined,
  });

  await db
    .update(deals)
    .set({
      name: parsed.name,
      valueCents: Math.round(parsed.iarrUsd * 100),
      implementationCostCents: Math.round(parsed.implementationCostUsd * 100),
      ownerName: cleanOptionalText(parsed.ownerName),
      nextStep: parsed.nextStep,
      nextStepDueDate: cleanOptionalText(parsed.nextStepDueDate),
      expectedCloseDate: cleanOptionalText(parsed.expectedCloseDate),
      companyId: parsed.companyId ?? null,
      primaryContactId: parsed.primaryContactId ?? null,
    })
    .where(eq(deals.id, parsed.dealId));

  revalidatePath("/");
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${parsed.dealId}`);
}

export async function updateDealStage(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = dealStageUpdateSchema.parse({
    dealId: formData.get("dealId"),
    stage: formData.get("stage"),
    reason: formData.get("reason"),
  });

  const existing = await db.query.deals.findFirst({
    where: eq(deals.id, parsed.dealId),
  });

  if (!existing) {
    throw new Error("Opportunity not found.");
  }

  await db
    .update(deals)
    .set({
      stage: parsed.stage,
    })
    .where(eq(deals.id, parsed.dealId));

  const reasonText =
    cleanOptionalText(parsed.reason) ?? (parsed.stage === "lost" ? "No reason provided." : null);
  const stageHistoryNote = reasonText
    ? `Stage changed: ${existing.stage} -> ${parsed.stage}. Reason: ${reasonText}`
    : `Stage changed: ${existing.stage} -> ${parsed.stage}.`;

  await db.insert(activities).values({
    type: "note",
    notes: stageHistoryNote,
    dealId: existing.id,
    companyId: existing.companyId,
    contactId: existing.primaryContactId,
  });

  revalidatePath("/");
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${parsed.dealId}`);
}

export async function createTask(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const rawDealId = formData.get("dealId")?.toString();
  const rawCompanyId = formData.get("companyId")?.toString();

  const parsed = taskSchema.parse({
    title: formData.get("title"),
    dueDate: formData.get("dueDate"),
    assignedTo: formData.get("assignedTo"),
    dealId: rawDealId ? Number(rawDealId) : undefined,
    companyId: rawCompanyId ? Number(rawCompanyId) : undefined,
  });

  const cleanedAssignedTo = cleanOptionalText(parsed.assignedTo);

  if (cleanedAssignedTo) {
    const userRows = await db.select({ username: users.username }).from(users);
    const usernames = new Set(userRows.map((row) => row.username));

    if (!usernames.has(cleanedAssignedTo)) {
      throw new Error("Assigned user is invalid.");
    }
  }

  await db.insert(salesTasks).values({
    title: parsed.title,
    dueDate: parsed.dueDate,
    assignedTo: cleanedAssignedTo,
    dealId: parsed.dealId ?? null,
    companyId: parsed.companyId ?? null,
  });

  revalidatePath("/");
}

export async function completeTask(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const taskId = z.coerce.number().int().positive().parse(formData.get("taskId"));

  await db.update(salesTasks).set({ status: "done" }).where(eq(salesTasks.id, taskId));

  revalidatePath("/");
}

export async function updateActivityDate(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = activityDateUpdateSchema.parse({
    activityId: formData.get("activityId"),
    occurredOn: formData.get("occurredOn"),
    returnPath: formData.get("returnPath"),
  });

  const existing = await db.query.activities.findFirst({
    where: eq(activities.id, parsed.activityId),
  });

  if (!existing) {
    throw new Error("Activity not found.");
  }

  const occurredAt = mergeDateWithTime(parsed.occurredOn, existing.occurredAt);
  if (!occurredAt) {
    throw new Error("Activity date must be a valid date.");
  }

  await db
    .update(activities)
    .set({
      occurredAt,
    })
    .where(eq(activities.id, parsed.activityId));

  revalidatePath("/activities");
  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
}

export async function logActivity(formData: FormData) {
  const session = await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const rawDealId = formData.get("dealId")?.toString();
  const rawContactId = formData.get("contactId")?.toString();
  const rawCompanyId = formData.get("companyId")?.toString();

  const parsed = activitySchema.parse({
    type: formData.get("type"),
    notes: formData.get("notes"),
    dealId: rawDealId ? Number(rawDealId) : undefined,
    contactId: rawContactId ? Number(rawContactId) : undefined,
    companyId: rawCompanyId ? Number(rawCompanyId) : undefined,
    occurredOn: formData.get("occurredOn"),
    returnPath: formData.get("returnPath"),
  });

  await db.insert(activities).values({
    type: parsed.type,
    notes: parsed.notes,
    loggedByUserId: session.userId,
    dealId: parsed.dealId ?? null,
    contactId: parsed.contactId ?? null,
    companyId: parsed.companyId ?? null,
    occurredAt: mergeDateWithTime(parsed.occurredOn) ?? undefined,
  });

  revalidatePath("/");
  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
}
