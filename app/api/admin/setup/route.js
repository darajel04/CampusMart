import { NextResponse } from "next/server";

import { adminSettings } from "../../../../lib/admin-auth";
import { createOwner } from "../../../../lib/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hanya bisa dipakai sekali: setelah akun pembuat project dibuat, endpoint ini
// menolak permintaan berikutnya sehingga pengunjung tidak bisa mengklaimnya.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (username.length < 3) {
    return NextResponse.json(
      { ok: false, message: "Username minimal 3 karakter." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, message: "Password minimal 8 karakter." },
      { status: 400 }
    );
  }

  try {
    const existing = await adminSettings();
    if (existing.configured && existing.mode === "owner") {
      return NextResponse.json(
        { ok: false, message: "Akun pembuat project sudah dibuat." },
        { status: 409 }
      );
    }
    const result = await createOwner(username, password);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: "Akun pembuat project sudah dibuat." },
        { status: 409 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Database katalog belum tersambung. Pemilik project perlu mengisi TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
