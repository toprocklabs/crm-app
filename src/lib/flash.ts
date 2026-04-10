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
  return cookieStore.get(FLASH_COOKIE)?.value ?? null;
}
