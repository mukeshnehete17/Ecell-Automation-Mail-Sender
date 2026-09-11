import { NextResponse } from "next/server";
import { getGmailContext } from "@/lib/gmail";

export async function GET() {
  const ctx = await getGmailContext();
  if (!ctx) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({ connected: true, email: ctx.email });
}
