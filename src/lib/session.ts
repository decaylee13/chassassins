import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Stateless sessions: the whole session lives in a signed cookie. There is no
 * session table. The cookie holds only the net ID; everything else about the
 * player is read fresh from the DB (or the static roster, for the admin) on
 * each request — see dal.ts.
 *
 * "Signed" (not encrypted): anyone can read the payload, but they cannot forge
 * one without SESSION_SECRET. That's fine here — the net ID is not a secret.
 */

const COOKIE_NAME = "chassassins_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error("SESSION_SECRET is not set");
}
const key = new TextEncoder().encode(secret);

interface SessionPayload extends JWTPayload {
  netId: string;
}

async function sign(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key);
}

async function verify(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.netId === "string") return { netId: payload.netId };
    return null;
  } catch {
    return null;
  }
}

export async function createSession(netId: string): Promise<void> {
  const token = await sign({ netId });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'lax',
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verify(store.get(COOKIE_NAME)?.value);
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
