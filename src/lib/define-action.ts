import type { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// Removes the four-line preamble every server action repeated — requireUser,
// getDb, the null check, the throw — and, more importantly, makes the
// authorization check structural. You cannot define an action through this
// helper without it running first (see planning/004-architecture-hardening, F05).
//
// Deliberately NOT generic over FormData parsing. Each action still supplies
// its own `input` mapper, because the existing mappers encode real subtleties
// that a generic marshaller would silently break — chiefly
// `id: raw ? Number(raw) : undefined`, which keeps a blank <select> out of a
// `z.coerce.number().positive()` field. A generic version would coerce "" to 0
// and reject it. The boilerplate worth deleting is the preamble, not the mapping.

export type Db = NonNullable<ReturnType<typeof getDb>>;
type Session = Awaited<ReturnType<typeof requireUser>>;

export type ActionContext<T> = {
  input: T;
  db: Db;
  session: Session;
  /** The raw FormData, for the rare action that needs a field its schema omits. */
  formData: FormData;
};

export function defineAction<S extends z.ZodType>({
  schema,
  input,
  handler,
}: {
  schema: S;
  /** Map FormData onto the shape `schema` expects. Stays explicit on purpose. */
  input: (formData: FormData) => unknown;
  handler: (ctx: ActionContext<z.infer<S>>) => Promise<void>;
}) {
  return async function action(formData: FormData): Promise<void> {
    const session = await requireUser();

    const db = getDb();
    if (!db) {
      throw new Error("DATABASE_URL is not set.");
    }

    const parsed = schema.parse(input(formData)) as z.infer<S>;

    await handler({ input: parsed, db, session, formData });
  };
}
