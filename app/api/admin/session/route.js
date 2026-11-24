import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE, verifySessionToken } from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const admin = verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);

  return NextResponse.json(
    { admin },
    { headers: { "Cache-Control": "no-store" } }
  );
}
