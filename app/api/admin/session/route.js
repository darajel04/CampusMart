import { NextResponse } from "next/server";

import { adminSettings, currentAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const configured = (await adminSettings()).configured;
    const admin = await currentAdmin();
    return NextResponse.json({ admin, configured, database: true }, { headers });
  } catch {
    return NextResponse.json({ admin: false, configured: false, database: false }, { headers });
  }
}
