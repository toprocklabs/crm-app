"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, clearSession, getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { compare } from "bcryptjs";

const loginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6).max(100),
});

export async function login(formData: FormData) {
  const db = getDb();

  if (!db) {
    redirect("/login?error=config");
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid");
  }

  const username = parsed.data.username.toLowerCase();

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    redirect("/login?error=invalid");
  }

  const passwordValid = await compare(parsed.data.password, user.passwordHash);

  if (!passwordValid) {
    redirect("/login?error=invalid");
  }

  await createSession({
    userId: user.id,
    username: user.username,
  });

  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function redirectIfAuthenticated() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }
}
