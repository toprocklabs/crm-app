import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

// Slug-scoped access cookie for public proposal pages. Replaces the old
// client-side PIN check in proposal_creator: the PIN is verified server-side
// and never shipped to the browser.
const PIN_COOKIE = "proposal_access";
const PIN_SESSION_HOURS = 12;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

// The internal master PIN opens every proposal (old INTERNAL_PIN behavior).
export function getInternalPin() {
  return process.env.PROPOSAL_INTERNAL_PIN ?? "3067";
}

export async function grantProposalAccess(slug: string) {
  const token = await new SignJWT({ scope: "proposal", slug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PIN_SESSION_HOURS}h`)
    .sign(getAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set(`${PIN_COOKIE}_${slug}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PIN_SESSION_HOURS * 60 * 60,
    path: `/p/${slug}`,
  });
}

export async function hasProposalAccess(slug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(`${PIN_COOKIE}_${slug}`)?.value;
  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return payload.scope === "proposal" && payload.slug === slug;
  } catch {
    return false;
  }
}

export function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
