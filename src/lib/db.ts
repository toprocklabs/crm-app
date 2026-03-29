import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!cachedDb) {
    cachedDb = drizzle(process.env.DATABASE_URL, { schema });
  }

  return cachedDb;
}

