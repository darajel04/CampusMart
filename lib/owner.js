import crypto from "node:crypto";

import { ensureSchema, getClient } from "./db";

const OWNER_KEYS = ["owner_username", "owner_password_hash", "owner_salt", "session_secret"];

async function readSettings() {
  await ensureSchema();
  const { rows } = await getClient().execute({
    sql: "SELECT key, value FROM settings WHERE key IN ('owner_username', 'owner_password_hash', 'owner_salt', 'session_secret')",
    args: [],
  });
  const map = {};
  for (const row of rows) map[row.key] = String(row.value);
  return map;
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

export async function ownerState() {
  const settings = await readSettings();
  return {
    configured: Boolean(
      settings.owner_username && settings.owner_password_hash && settings.owner_salt
    ),
    username: settings.owner_username || "",
    hash: settings.owner_password_hash || "",
    salt: settings.owner_salt || "",
    secret: settings.session_secret || "",
  };
}

// Akun pembuat project hanya bisa dibuat sekali. Setelah ada, formulir setup
// ditutup permanen dan kredensial diverifikasi terhadap hash di database.
export async function createOwner(username, password) {
  await ensureSchema();
  const state = await ownerState();
  if (state.configured) {
    return { ok: false, reason: "already_configured" };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const secret = crypto.randomBytes(32).toString("hex");

  const db = getClient();
  const entries = [
    ["owner_username", username],
    ["owner_password_hash", hash],
    ["owner_salt", salt],
    ["session_secret", secret],
  ];
  for (const [key, value] of entries) {
    await db.execute({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [key, value],
    });
  }

  return { ok: true };
}

export { OWNER_KEYS };
