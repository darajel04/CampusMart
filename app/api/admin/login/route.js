import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  adminLoginAllowed,
  checkCredentials,
  createSessionToken,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!adminLoginAllowed()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Login admin belum dikonfigurasi. Pemilik proyek perlu mengisi ADMIN_USERNAME dan ADMIN_PASSWORD di Vercel.",
      },
      { status: 503 }
    );
  }

  if (!checkCredentials(username, password)) {
    return NextResponse.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
