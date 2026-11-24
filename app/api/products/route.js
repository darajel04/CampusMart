import { NextResponse } from "next/server";

import { currentAdmin } from "../../../lib/admin-auth";
import { createProduct, listProducts } from "../../../lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

const CATEGORIES = ["Buku", "Alat Tulis", "Makanan", "Fashion", "Elektronik"];

export async function GET() {
  try {
    const products = await listProducts();
    return NextResponse.json({ products }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { products: [], error: "database_unavailable" },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function POST(request) {
  if (!(await currentAdmin())) {
    return NextResponse.json(
      { ok: false, message: "Hanya pembuat project yang dapat menambahkan produk." },
      { status: 401, headers: NO_STORE }
    );
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const price = Number(body?.price);
  const category = typeof body?.category === "string" ? body.category : "";
  const icon = typeof body?.icon === "string" ? body.icon.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";

  if (!name || !Number.isFinite(price) || price <= 0 || !CATEGORIES.includes(category) || !phone) {
    return NextResponse.json(
      { ok: false, message: "Periksa kembali data produk." },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const products = await createProduct({
      name,
      price: Math.round(price),
      category,
      icon: icon || "📦",
      phone,
    });
    return NextResponse.json({ ok: true, products }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Gagal menyimpan produk ke database." },
      { status: 500, headers: NO_STORE }
    );
  }
}
