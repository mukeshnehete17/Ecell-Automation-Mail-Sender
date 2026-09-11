import { NextResponse } from "next/server";
import { getGmailContext } from "@/lib/gmail";
import { isOAuthConfigured, missingOAuthEnv } from "@/lib/env";

export async function GET() {
  if (!isOAuthConfigured()) {
    return NextResponse.json({
      connected: false,
      configured: false,
      error: `Google OAuth is not configured (missing: ${missingOAuthEnv().join(", ")}).`,
    });
  }
  const ctx = await getGmailContext();
  if (!ctx) {
    return NextResponse.json({ connected: false, configured: true });
  }
  return NextResponse.json({ connected: true, configured: true, email: ctx.email });
}
