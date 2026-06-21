"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setFlashToast } from "@/lib/flash";
import { requireUser } from "@/lib/auth";
import { accountStageOptions } from "@/lib/account-stage";
import { edgeTypeOptions } from "@/lib/edge-type";
import { getDb } from "@/lib/db";
import { companyIndustries } from "@/lib/company-industries";
import { normalizeCompanyIndustry } from "@/lib/company-industry-utils";
import { scrapeCompanyWebsite } from "@/lib/enrich";
import { geocodeAddress } from "@/lib/geocode";
import { researchBusiness, estimateCostCents } from "@/lib/research-enrich";
import { sourceNearbyBusinesses } from "@/lib/source-nearby";
import { activities, agentRuns, companies, contacts, deals, placeEnrichment, relationships, salesTasks, suggestions, users } from "@/lib/schema";

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
  mrrUsd: z.coerce.number().min(0),
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
  mrrUsd: z.coerce.number().min(0),
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

const dealFieldUpdateSchema = z.object({
  dealId: z.coerce.number().int().positive(),
  field: z.enum([
    "name",
    "mrrUsd",
    "implementationCostUsd",
    "ownerName",
    "nextStep",
    "nextStepDueDate",
    "expectedCloseDate",
    "companyId",
    "primaryContactId",
  ]),
  value: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().trim().min(2),
  dueDate: z.string().min(4),
  assignedTo: z.string().trim().optional(),
  dealId: z.coerce.number().int().positive().optional(),
  companyId: z.coerce.number().int().positive().optional(),
  returnPath: z.string().optional(),
});

const completeTaskSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  returnPath: z.string().optional(),
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

const entityTypeSchema = z.enum(["company", "contact"]);

const relationshipSchema = z.object({
  fromType: entityTypeSchema,
  fromId: z.coerce.number().int().positive(),
  toType: entityTypeSchema,
  toId: z.coerce.number().int().positive(),
  edgeType: z.enum(edgeTypeOptions as [string, ...string[]]),
  strength: z.coerce.number().int().min(0).max(100).optional(),
  evidence: z.string().trim().optional(),
  returnPath: z.string().optional(),
});

const relationshipDeleteSchema = z.object({
  relationshipId: z.coerce.number().int().positive(),
  returnPath: z.string().optional(),
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
  revalidatePath("/accounts");
  await setFlashToast("Account created");
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
  await setFlashToast("Contact created");
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
    mrrUsd: formData.get("mrrUsd"),
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
    valueCents: Math.round(parsed.mrrUsd * 100),
    implementationCostCents: Math.round(parsed.implementationCostUsd * 100),
    ownerName: cleanOptionalText(parsed.ownerName),
    nextStep: parsed.nextStep,
    nextStepDueDate: cleanOptionalText(parsed.nextStepDueDate),
    companyId: parsed.companyId ?? null,
    expectedCloseDate: cleanOptionalText(parsed.expectedCloseDate),
  });

  revalidatePath("/");
  revalidatePath("/opportunities");
  await setFlashToast("Opportunity created");
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
    mrrUsd: formData.get("mrrUsd"),
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
      valueCents: Math.round(parsed.mrrUsd * 100),
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
  await setFlashToast("Opportunity updated");
}

export async function updateDealField(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = dealFieldUpdateSchema.parse({
    dealId: formData.get("dealId"),
    field: formData.get("field"),
    value: formData.get("value"),
  });

  const cleaned = cleanOptionalText(parsed.value);

  if (parsed.field === "name" || parsed.field === "nextStep") {
    const text = z.string().trim().min(2).parse(parsed.value);
    await db
      .update(deals)
      .set(parsed.field === "name" ? { name: text } : { nextStep: text })
      .where(eq(deals.id, parsed.dealId));
  }

  if (parsed.field === "mrrUsd" || parsed.field === "implementationCostUsd") {
    const amount = z.coerce.number().min(0).parse(parsed.value);
    const cents = Math.round(amount * 100);
    await db
      .update(deals)
      .set(parsed.field === "mrrUsd" ? { valueCents: cents } : { implementationCostCents: cents })
      .where(eq(deals.id, parsed.dealId));
  }

  if (parsed.field === "ownerName") {
    await db.update(deals).set({ ownerName: cleaned }).where(eq(deals.id, parsed.dealId));
  }

  if (parsed.field === "nextStepDueDate" || parsed.field === "expectedCloseDate") {
    if (cleaned) {
      z.string().date().parse(cleaned);
    }
    await db
      .update(deals)
      .set(parsed.field === "nextStepDueDate" ? { nextStepDueDate: cleaned } : { expectedCloseDate: cleaned })
      .where(eq(deals.id, parsed.dealId));
  }

  if (parsed.field === "companyId" || parsed.field === "primaryContactId") {
    const id = cleaned ? z.coerce.number().int().positive().parse(cleaned) : null;
    await db
      .update(deals)
      .set(parsed.field === "companyId" ? { companyId: id } : { primaryContactId: id })
      .where(eq(deals.id, parsed.dealId));
  }

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
  await setFlashToast(`Opportunity marked ${parsed.stage}`);
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
    returnPath: formData.get("returnPath"),
  });

  let cleanedAssignedTo = cleanOptionalText(parsed.assignedTo);

  if (cleanedAssignedTo) {
    const userRows = await db.select({ username: users.username }).from(users);
    const usernames = new Set(userRows.map((row) => row.username));

    if (!usernames.has(cleanedAssignedTo)) {
      cleanedAssignedTo = null;
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
  revalidatePath("/tasks");
  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
  await setFlashToast("Task created");
}

export async function completeTask(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = completeTaskSchema.parse({
    taskId: formData.get("taskId"),
    returnPath: formData.get("returnPath"),
  });

  await db.update(salesTasks).set({ status: "done" }).where(eq(salesTasks.id, parsed.taskId));

  revalidatePath("/");
  revalidatePath("/tasks");
  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
  await setFlashToast("Task completed");
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
  await setFlashToast("Activity logged");
}

const enrichSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  returnPath: z.string().optional(),
});

export async function enrichCompanyFromWebsite(formData: FormData) {
  const session = await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = enrichSchema.parse({
    companyId: formData.get("companyId"),
    returnPath: formData.get("returnPath"),
  });

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, parsed.companyId),
  });
  if (!company) {
    throw new Error("Account not found.");
  }
  if (!company.website) {
    await setFlashToast("Add a website first, then enrich.");
    return;
  }

  const result = await scrapeCompanyWebsite(company.website);

  if (!result.ok) {
    await setFlashToast(`Could not scrape site: ${result.error ?? "unknown error"}`);
    if (parsed.returnPath?.startsWith("/")) {
      revalidatePath(parsed.returnPath);
    }
    return;
  }

  // Fill structured fields only when empty — never clobber human-entered data.
  const updates: Partial<typeof companies.$inferInsert> = {};
  if (!company.address && result.address) {
    updates.address = result.address;
  }
  if (!company.industry && result.industryGuess) {
    updates.industry = result.industryGuess;
  }

  // Geocode the address (scraped or already on file) when we don't have
  // coordinates yet, so the proximity / "plaza neighbors" graph can use it.
  const addressToGeocode = updates.address ?? company.address;
  let geocode: Awaited<ReturnType<typeof geocodeAddress>> = null;
  if (addressToGeocode && company.lat == null && company.lng == null) {
    geocode = await geocodeAddress(addressToGeocode);
    if (geocode) {
      updates.lat = geocode.lat;
      updates.lng = geocode.lng;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(companies).set(updates).where(eq(companies.id, company.id));
  }

  // Cache the geocode so we don't re-hit the provider on every render.
  if (geocode) {
    await db
      .insert(placeEnrichment)
      .values({
        companyId: company.id,
        formattedAddress: geocode.formattedAddress,
        lat: geocode.lat,
        lng: geocode.lng,
        provider: geocode.provider,
      })
      .onConflictDoUpdate({
        target: placeEnrichment.companyId,
        set: {
          formattedAddress: geocode.formattedAddress,
          lat: geocode.lat,
          lng: geocode.lng,
          provider: geocode.provider,
        },
      });
  }

  // Log everything we found as an agent-sourced activity so it is auditable
  // and reversible, and the contact details surface for human follow-up.
  const lines: string[] = [`Website enrichment from ${result.fetchedUrl}`];
  if (result.description) lines.push(`About: ${result.description}`);
  if (result.industryGuess) lines.push(`Industry guess: ${result.industryGuess}`);
  if (result.address) lines.push(`Address: ${result.address}`);
  if (geocode) lines.push(`Geocoded (${geocode.provider}): ${geocode.lat.toFixed(5)}, ${geocode.lng.toFixed(5)}`);
  if (result.emails.length) lines.push(`Emails: ${result.emails.join(", ")}`);
  if (result.phones.length) lines.push(`Phones: ${result.phones.join(", ")}`);
  const socialList = Object.values(result.socials).filter(Boolean);
  if (socialList.length) lines.push(`Social: ${socialList.join(", ")}`);
  if (lines.length === 1) lines.push("No structured contact details found on the homepage.");

  await db.insert(activities).values({
    type: "note",
    notes: lines.join("\n"),
    loggedByUserId: session.userId,
    companyId: company.id,
    source: "agent",
  });

  revalidatePath(`/accounts/${company.id}`);
  revalidatePath("/accounts");
  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
  await setFlashToast(
    `Enriched from website — ${result.emails.length} email(s), ${result.phones.length} phone(s) found`,
  );
}

// --- Agentic online enrichment (Claude web search) ---

const researchSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  returnPath: z.string().optional(),
});

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? full.trim(), last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// "Research & enrich": Claude searches the open web for the business and writes
// back the website, owner/contacts, and a full enrichment note. Repeatable on
// any account. Needs ANTHROPIC_API_KEY; degrades gracefully without it.
export async function researchAndEnrichCompany(formData: FormData) {
  const session = await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = researchSchema.parse({
    companyId: formData.get("companyId"),
    returnPath: formData.get("returnPath"),
  });

  const company = await db.query.companies.findFirst({ where: eq(companies.id, parsed.companyId) });
  if (!company) {
    throw new Error("Account not found.");
  }

  const runRows = await db
    .insert(agentRuns)
    .values({ loop: "enrich", model: "claude-opus-4-8", status: "running", notes: `Research ${company.name}` })
    .returning({ id: agentRuns.id });
  const runId = runRows[0]?.id;

  const outcome = await researchBusiness({ name: company.name, address: company.address });

  if (!outcome.ok) {
    if (runId) {
      await db.update(agentRuns).set({ status: "error", notes: outcome.error, finishedAt: new Date() }).where(eq(agentRuns.id, runId));
    }
    await setFlashToast(outcome.error);
    if (parsed.returnPath?.startsWith("/")) revalidatePath(parsed.returnPath);
    return;
  }

  const r = outcome.result;

  // Fill empty company fields (never clobber human-entered data).
  const updates: Partial<typeof companies.$inferInsert> = {};
  if (!company.website && r.website) {
    updates.website = normalizeUrl(r.website);
  }
  if (!company.industry && r.industryGuess) {
    const normalized = normalizeCompanyIndustry(r.industryGuess);
    if (normalized && (companyIndustries as readonly string[]).includes(normalized)) {
      updates.industry = normalized;
    }
  }
  if (Object.keys(updates).length > 0) {
    await db.update(companies).set(updates).where(eq(companies.id, company.id));
  }

  // Create / update contacts for the people we found (cap at 5).
  let contactsAdded = 0;
  for (const c of r.contacts.slice(0, 5)) {
    if (!c.name && !c.email) continue;
    const { first, last } = splitName(c.name ?? c.email!.split("@")[0]);
    if (c.email) {
      await db
        .insert(contacts)
        .values({ firstName: first, lastName: last, email: c.email, phone: c.phone, title: c.title, companyId: company.id })
        .onConflictDoUpdate({
          target: contacts.email,
          set: { firstName: first, lastName: last, phone: c.phone, title: c.title, companyId: company.id },
        });
      contactsAdded++;
    } else {
      const existing = await db.query.contacts.findFirst({
        where: and(eq(contacts.companyId, company.id), eq(contacts.firstName, first), eq(contacts.lastName, last)),
      });
      if (!existing) {
        await db.insert(contacts).values({ firstName: first, lastName: last, phone: c.phone, title: c.title, companyId: company.id });
        contactsAdded++;
      }
    }
  }

  // Auditable enrichment note in the timeline.
  const lines: string[] = [`Online enrichment (Claude web search)`];
  if (r.summary) lines.push(r.summary);
  if (r.website) lines.push(`Website: ${r.website}`);
  if (r.phone) lines.push(`Phone: ${r.phone}`);
  if (r.emails.length) lines.push(`Emails: ${r.emails.join(", ")}`);
  for (const c of r.contacts) {
    const bits = [c.name, c.title, c.email, c.phone].filter(Boolean).join(" · ");
    if (bits) lines.push(`Contact: ${bits}`);
  }
  const socials = Object.values(r.socials).filter(Boolean);
  if (socials.length) lines.push(`Social: ${socials.join(", ")}`);
  if (r.bookingUrl) lines.push(`Booking: ${r.bookingUrl}`);
  if (r.hours) lines.push(`Hours: ${r.hours}`);
  if (r.confidenceNote) lines.push(`Note: ${r.confidenceNote}`);
  if (r.sources.length) lines.push(`Sources: ${r.sources.slice(0, 8).join(", ")}`);

  await db.insert(activities).values({
    type: "note",
    notes: lines.join("\n"),
    loggedByUserId: session.userId,
    companyId: company.id,
    source: "agent",
  });

  if (runId) {
    await db
      .update(agentRuns)
      .set({
        status: "ok",
        tokensIn: outcome.usage.inputTokens,
        tokensOut: outcome.usage.outputTokens,
        costCents: estimateCostCents(outcome.usage.inputTokens, outcome.usage.outputTokens),
        itemsProposed: contactsAdded,
        finishedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));
  }

  revalidatePath(`/accounts/${company.id}`);
  revalidatePath("/accounts");
  if (parsed.returnPath?.startsWith("/")) revalidatePath(parsed.returnPath);
  await setFlashToast(`Enriched ${company.name} — ${contactsAdded} contact(s) added`);
}

// --- Sourcing suggestion queue (nearby-business leads) ---

const suggestionActionSchema = z.object({
  suggestionId: z.coerce.number().int().positive(),
});

type NewCompanySuggestionPayload = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  nearCompanyId?: number;
  nearCompanyName?: string;
  category?: string;
};

// Promote a sourced "nearby business" suggestion into a real new_lead account,
// and auto-link it to the customer it was found near (so the warm-path graph
// immediately knows the new lead sits in a proven plaza).
export async function approveSuggestion(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const { suggestionId } = suggestionActionSchema.parse({
    suggestionId: formData.get("suggestionId"),
  });

  const suggestion = await db.query.suggestions.findFirst({
    where: eq(suggestions.id, suggestionId),
  });
  if (!suggestion || suggestion.status !== "pending") {
    await setFlashToast("That suggestion was already handled.");
    revalidatePath("/inbox");
    return;
  }

  const payload = (suggestion.payload ?? {}) as NewCompanySuggestionPayload;
  const name = payload.name?.trim();
  if (!name) {
    await setFlashToast("Suggestion is missing a business name.");
    return;
  }

  // Don't create a duplicate if the user already added this account by hand.
  const existing = await db.query.companies.findFirst({
    where: eq(companies.name, name),
  });

  let companyId = existing?.id ?? null;
  if (!companyId) {
    // The OSM category (e.g. "beauty") is not a CRM industry — only keep it if
    // it maps to a real one, otherwise leave industry unset for the user to fill.
    const normalized = normalizeCompanyIndustry(payload.category);
    const industry =
      normalized && (companyIndustries as readonly string[]).includes(normalized) ? normalized : null;
    const inserted = await db
      .insert(companies)
      .values({
        name,
        stage: "new_lead",
        industry,
        address: payload.address ?? null,
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
      })
      .returning({ id: companies.id });
    companyId = inserted[0].id;
  }

  // Auto-wire the colocated edge back to the customer it was sourced near.
  if (payload.nearCompanyId && companyId !== payload.nearCompanyId) {
    const [fromId, toId] =
      companyId < payload.nearCompanyId
        ? [companyId, payload.nearCompanyId]
        : [payload.nearCompanyId, companyId];
    await db
      .insert(relationships)
      .values({
        fromType: "company",
        fromId,
        toType: "company",
        toId,
        edgeType: "colocated_with",
        strength: 80,
        evidence: suggestion.evidence ?? `Sourced near ${payload.nearCompanyName ?? "a customer"}`,
        source: "agent",
      })
      .onConflictDoNothing();
  }

  await db
    .update(suggestions)
    .set({ status: "approved", resolvedAt: new Date() })
    .where(eq(suggestions.id, suggestionId));

  revalidatePath("/inbox");
  revalidatePath("/map");
  revalidatePath("/accounts");
  revalidatePath("/");
  await setFlashToast(`Added ${name} as a new lead`);
}

// --- Live sourcing: "Find more businesses nearby" from the map ---

const scanSchema = z.object({
  companyId: z.coerce.number().int().positive(),
});

// Adaptive radius: OSM is sparse, so a tight ring often only re-surfaces the
// businesses we already have. Widen until we turn up enough genuinely-new ones.
const SCAN_RADII_M = [300, 1000];
const MIN_NEW_TARGET = 6;
// Cap how many new prospects one scan can queue — a simple budget guard until
// the LLM analyst phase introduces a real token ceiling.
const MAX_NEW_PER_SCAN = 20;
const normName = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export async function scanCustomerForReferrals(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const { companyId } = scanSchema.parse({ companyId: formData.get("companyId") });

  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) {
    throw new Error("Account not found.");
  }
  if (company.lat == null || company.lng == null) {
    await setFlashToast("Geocode this account first (Enrich from website), then scan.");
    return;
  }

  // Audit the run so every sweep is accountable (and budget-guardable later).
  const runRows = await db
    .insert(agentRuns)
    .values({ loop: "sourcing", status: "running", notes: `Find businesses near ${company.name}` })
    .returning({ id: agentRuns.id });
  const runId = runRows[0]?.id;

  // De-dupe sets first, so the adaptive radius can measure how many businesses
  // are genuinely new (not already an account or already in the queue).
  const [companyRows, suggestionRows] = await Promise.all([
    db.select({ name: companies.name }).from(companies),
    db.select({ payload: suggestions.payload, kind: suggestions.kind, status: suggestions.status }).from(suggestions),
  ]);
  const existing = new Set(companyRows.map((c) => normName(c.name)));
  const queued = new Set(
    suggestionRows
      .filter((s) => s.kind === "new_company" && (s.status === "pending" || s.status === "approved"))
      .map((s) => normName(((s.payload ?? {}) as { name?: string }).name ?? ""))
      .filter(Boolean),
  );
  const isFresh = (name: string) => {
    const key = normName(name);
    return !existing.has(key) && !queued.has(key);
  };

  // Widen the radius until we surface enough new businesses (or run out of tiers).
  let raw: Awaited<ReturnType<typeof sourceNearbyBusinesses>> = [];
  let radiusUsed = SCAN_RADII_M[0];
  for (const r of SCAN_RADII_M) {
    radiusUsed = r;
    raw = await sourceNearbyBusinesses(company.lat, company.lng, r);
    if (raw.filter((c) => isFresh(c.name)).length >= MIN_NEW_TARGET) break;
  }

  // Closest first — warmer prospects lead — then cap the batch.
  const fresh = raw
    .filter((c) => isFresh(c.name))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_NEW_PER_SCAN);

  let inserted = 0;
  for (const c of fresh) {
    const confidence = Math.max(5, Math.min(100, Math.round(100 - (c.distanceMeters / radiusUsed) * 60)));
    await db.insert(suggestions).values({
      kind: "new_company",
      title: `${c.name} — ${c.category} near ${company.name}`,
      payload: {
        name: c.name,
        category: c.category,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        nearCompanyId: company.id,
        nearCompanyName: company.name,
        distanceMeters: c.distanceMeters,
      },
      confidence,
      evidence: `Found via OpenStreetMap ~${c.distanceMeters}m from ${company.name} (customer)`,
      source: "agent",
      status: "pending",
    });
    inserted++;
  }

  if (runId) {
    await db
      .update(agentRuns)
      .set({
        status: "ok",
        itemsSeen: raw.length,
        itemsProposed: inserted,
        notes: `Find businesses near ${company.name} (radius ${radiusUsed}m)`,
        finishedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));
  }

  revalidatePath("/map");
  revalidatePath("/inbox");
  const message =
    inserted > 0
      ? `Found ${inserted} new business${inserted === 1 ? "" : "es"} near ${company.name}`
      : raw.length > 0
        ? `Every business OpenStreetMap maps near ${company.name} is already in your CRM`
        : `OpenStreetMap has no businesses mapped near ${company.name} yet`;
  await setFlashToast(message);
}

export async function dismissSuggestion(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const { suggestionId } = suggestionActionSchema.parse({
    suggestionId: formData.get("suggestionId"),
  });

  await db
    .update(suggestions)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(and(eq(suggestions.id, suggestionId), eq(suggestions.status, "pending")));

  revalidatePath("/inbox");
  revalidatePath("/map");
  await setFlashToast("Suggestion dismissed");
}

export async function createRelationship(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = relationshipSchema.parse({
    fromType: formData.get("fromType"),
    fromId: formData.get("fromId"),
    toType: formData.get("toType"),
    toId: formData.get("toId"),
    edgeType: formData.get("edgeType"),
    strength: formData.get("strength") ?? undefined,
    evidence: formData.get("evidence"),
    returnPath: formData.get("returnPath"),
  });

  if (parsed.fromType === parsed.toType && parsed.fromId === parsed.toId) {
    throw new Error("An entity cannot have a relationship to itself.");
  }

  await db
    .insert(relationships)
    .values({
      fromType: parsed.fromType,
      fromId: parsed.fromId,
      toType: parsed.toType,
      toId: parsed.toId,
      edgeType: parsed.edgeType as (typeof edgeTypeOptions)[number],
      strength: parsed.strength ?? 50,
      evidence: cleanOptionalText(parsed.evidence),
      source: "manual",
    })
    .onConflictDoUpdate({
      target: [
        relationships.fromType,
        relationships.fromId,
        relationships.toType,
        relationships.toId,
        relationships.edgeType,
      ],
      set: {
        strength: parsed.strength ?? 50,
        evidence: cleanOptionalText(parsed.evidence),
        lastConfirmedAt: new Date(),
      },
    });

  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
  await setFlashToast("Relationship saved");
}

export async function deleteRelationship(formData: FormData) {
  await requireUser();

  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  const parsed = relationshipDeleteSchema.parse({
    relationshipId: formData.get("relationshipId"),
    returnPath: formData.get("returnPath"),
  });

  await db.delete(relationships).where(eq(relationships.id, parsed.relationshipId));

  if (parsed.returnPath?.startsWith("/")) {
    revalidatePath(parsed.returnPath);
  }
  await setFlashToast("Relationship removed");
}
