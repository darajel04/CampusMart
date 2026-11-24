import fs from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";

const LOCAL_URL = "file:.data/campusmart.db";

export const SEED_PRODUCTS = [
  { name: "Buku Pemrograman Dasar", price: 65000, category: "Buku", icon: "📚", phone: "6281234567890" },
  { name: "Paket Alat Tulis", price: 25000, category: "Alat Tulis", icon: "✏️", phone: "6281234567890" },
  { name: "Tote Bag Campus", price: 45000, category: "Fashion", icon: "👜", phone: "6281234567890" },
  { name: "Kopi Susu", price: 15000, category: "Makanan", icon: "☕", phone: "6281234567890" },
  { name: "Mouse Wireless", price: 85000, category: "Elektronik", icon: "🖱️", phone: "6281234567890" },
  { name: "Novel Best Seller", price: 50000, category: "Buku", icon: "📖", phone: "6281234567890" },
];

let client = null;
let schemaPromise = null;

export function hasRemoteDatabase() {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || LOCAL_URL;
    if (url.startsWith("file:")) {
      const filePath = url.slice("file:".length);
      fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
    }
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}

async function createSchema() {
  const db = getClient();
  await db.execute(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  const { rows } = await db.execute("SELECT COUNT(*) AS total FROM products");
  if (Number(rows[0]?.total || 0) === 0) {
    for (const product of SEED_PRODUCTS) {
      await db.execute({
        sql: "INSERT INTO products (name, price, category, icon, phone) VALUES (?, ?, ?, ?, ?)",
        args: [product.name, product.price, product.category, product.icon, product.phone],
      });
    }
  }
}

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
