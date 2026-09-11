import { NextResponse } from "next/server";
import { sendOneEmail } from "@/lib/send-email";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const result = await sendOneEmail(body as Parameters<typeof sendOneEmail>[0]);
  return NextResponse.json(result.body, { status: result.status });
}
