import { SEED_PRODUCTS, ensureSchema, getClient } from "./db";

function toProduct(row) {
  return {
    id: Number(row.id),
    name: String(row.name),
    price: Number(row.price),
    category: String(row.category),
    icon: String(row.icon),
    phone: String(row.phone),
  };
}

export async function listProducts() {
  await ensureSchema();
  const { rows } = await getClient().execute(
    "SELECT id, name, price, category, icon, phone FROM products ORDER BY id DESC"
  );
  return rows.map(toProduct);
}

export async function createProduct({ name, price, category, icon, phone }) {
  await ensureSchema();
  await getClient().execute({
    sql: "INSERT INTO products (name, price, category, icon, phone) VALUES (?, ?, ?, ?, ?)",
    args: [name, price, category, icon || "📦", phone],
  });
  return listProducts();
}

export async function updateProductPrice(id, price) {
  await ensureSchema();
  await getClient().execute({
    sql: "UPDATE products SET price = ? WHERE id = ?",
    args: [price, id],
  });
  return listProducts();
}

export async function deleteProduct(id) {
  await ensureSchema();
  await getClient().execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
  return listProducts();
}

export async function resetProducts() {
  const db = getClient();
  await ensureSchema();
  await db.execute("DELETE FROM products");
  for (const product of SEED_PRODUCTS) {
    await db.execute({
      sql: "INSERT INTO products (name, price, category, icon, phone) VALUES (?, ?, ?, ?, ?)",
      args: [product.name, product.price, product.category, product.icon, product.phone],
    });
  }
  return listProducts();
}
