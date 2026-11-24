import crypto from "node:crypto";

export const ADMIN_COOKIE = "cm_admin";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 jam

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "campusmart-local-dev";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

// Bandingkan lewat hash agar panjang string tidak bocor lewat waktu eksekusi.
function safeEqual(a, b) {
  const left = crypto.createHash("sha256").update(String(a)).digest();
  const right = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

// Kredensial bawaan (admin/admin) hanya untuk pengembangan lokal. Di deployment
// Vercel login admin wajib memakai kredensial milik pembuat project, supaya
// pengunjung tidak bisa masuk admin dan menambahkan produk.
export function adminLoginAllowed() {
  return isAdminConfigured() || !process.env.VERCEL;
}

export function checkCredentials(username, password) {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin";
  const usernameOk = safeEqual(username, expectedUsername);
  const passwordOk = safeEqual(password, expectedPassword);
  return usernameOk && passwordOk;
}

export function createSessionToken() {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  return `${expires}.${sign(String(expires))}`;
}

export function verifySessionToken(token) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
