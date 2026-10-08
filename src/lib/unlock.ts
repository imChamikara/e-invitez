import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/** Signed "unlocked" cookie for password-protected events. */
function secret(): string {
  const s = process.env.EVENT_COOKIE_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("EVENT_COOKIE_SECRET is not set");
    return "dev-only-secret";
  }
  return s;
}

const cookieName = (slug: string) => `unlock_${slug}`;
const sign = (slug: string) => createHmac("sha256", secret()).update(`unlock:${slug}`).digest("hex");

export async function isUnlocked(slug: string): Promise<boolean> {
  const value = (await cookies()).get(cookieName(slug))?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(sign(slug));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setUnlocked(slug: string): Promise<void> {
  (await cookies()).set(cookieName(slug), sign(slug), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
