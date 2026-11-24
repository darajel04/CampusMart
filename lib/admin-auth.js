import crypto from "node:crypto";

import { cookies } from "next/headers";

import { hashPassword, ownerState } from "./owner";

export const ADMIN_COOKIE = "cm_admin";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 jam

function fallbackSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "campusmart-local-dev";
}

async function sessionSecret() {
  const state = await ownerState();
  return state.secret || fallbackSecret();
}

function sign(secret, value) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

// Bandingkan lewat hash agar panjang string tidak bocor lewat waktu eksekusi.
function safeEqual(a, b) {
  const left = crypto.createHash("sha256").update(String(a)).digest();
  const right = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

// Status akun admin: akun pembuat project di database lebih diutamakan,
// kredensial env tetap dipakai sebagai cadangan untuk pengembangan lokal.
export async function adminSettings() {
  const state = await ownerState();
  if (state.configured) {
    return { configured: true, mode: "owner", username: state.username };
  }
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    return { configured: true, mode: "env", username: process.env.ADMIN_USERNAME };
  }
  return { configured: false, mode: "none", username: "" };
}

export async function checkCredentials(username, password) {
  const state = await ownerState();
  if (state.configured) {
    const usernameOk = safeEqual(username, state.username);
    const passwordOk = safeEqual(hashPassword(password, state.salt), state.hash);
    return usernameOk && passwordOk;
  }
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    return (
      safeEqual(username, process.env.ADMIN_USERNAME) &&
      safeEqual(password, process.env.ADMIN_PASSWORD)
    );
  }
  return false;
}

export async function createSessionToken() {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  return `${expires}.${sign(await sessionSecret(), String(expires))}`;
}

export async function verifySessionToken(token) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  const expected = sign(await sessionSecret(), expires);
  if (!safeEqual(signature, expected)) return false;
  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function currentAdmin() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
}
