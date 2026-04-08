import { cookies } from "next/headers";

const FLASH_COOKIE = "flash_toast";

export async function setFlashToast(message: string) {
  const cookieStore = await cookies();
  cookieStore.set(FLASH_COOKIE, message, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 10,
    path: "/",
  });
}

export async function getFlashToast(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(FLASH_COOKIE)?.value ?? null;
  if (value) {
    cookieStore.delete(FLASH_COOKIE);
  }
  return value;
}
