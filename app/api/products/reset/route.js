import { NextResponse } from "next/server";

import { currentAdmin } from "../../../../lib/admin-auth";
import { resetProducts } from "../../../../lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST() {
  if (!(await currentAdmin())) {
    return NextResponse.json(
      { ok: false, message: "Hanya pembuat project yang dapat mengatur ulang produk." },
      { status: 401, headers: NO_STORE }
    );
  }

  try {
    const products = await resetProducts();
    return NextResponse.json({ ok: true, products }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Gagal mengatur ulang produk di database." },
      { status: 500, headers: NO_STORE }
    );
  }
}
