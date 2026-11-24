import { NextResponse } from "next/server";

import { cookies } from "next/headers";

import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  adminSettings,
  checkCredentials,
  createSessionToken,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  let settings = null;
  try {
    settings = await adminSettings();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "Database katalog belum tersambung. Pemilik project perlu mengisi TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN.",
      },
      { status: 503 }
    );
  }

  if (!settings.configured) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message: "Belum ada akun pembuat project. Buat akun pembuat terlebih dahulu.",
      },
      { status: 409 }
    );
  }

  if (!(await checkCredentials(username, password))) {
    return NextResponse.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
