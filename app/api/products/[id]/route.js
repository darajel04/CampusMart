import { NextResponse } from "next/server";

import { currentAdmin } from "../../../../lib/admin-auth";
import { deleteProduct, updateProductPrice } from "../../../../lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function productId(params) {
  const resolved = await params;
  const id = Number(resolved?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request, { params }) {
  if (!(await currentAdmin())) {
    return NextResponse.json(
      { ok: false, message: "Hanya pembuat project yang dapat mengubah produk." },
      { status: 401, headers: NO_STORE }
    );
  }

  const id = await productId(params);
  const body = await request.json().catch(() => null);
  const price = Number(body?.price);
  if (!id || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { ok: false, message: "Harga harus lebih dari 0." },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const products = await updateProductPrice(id, Math.round(price));
    return NextResponse.json({ ok: true, products }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Gagal mengubah harga di database." },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function DELETE(_request, { params }) {
  if (!(await currentAdmin())) {
    return NextResponse.json(
      { ok: false, message: "Hanya pembuat project yang dapat menghapus produk." },
      { status: 401, headers: NO_STORE }
    );
  }

  const id = await productId(params);
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Produk tidak ditemukan." },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const products = await deleteProduct(id);
    return NextResponse.json({ ok: true, products }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Gagal menghapus produk di database." },
      { status: 500, headers: NO_STORE }
    );
  }
}
