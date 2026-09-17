import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Password hashing via Node's built-in scrypt — no extra dependency (no
 * bcrypt, which needs a native build step that's awkward on serverless).
 * Stored as "<salt-hex>:<hash-hex>".
 */
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = scryptSync(password, salt, KEY_LENGTH);
  if (hashBuffer.length !== candidateBuffer.length) return false;

  return timingSafeEqual(hashBuffer, candidateBuffer);
}

export const MIN_PASSWORD_LENGTH = 8;
