import { NextResponse } from "next/server";
import { sendOneEmail } from "@/lib/send-email";

// Sends exactly one real email (used for the "Send Test Email" flow).
// The client personalizes subject/body with a real recipient's data and
// addresses it to the test inbox, so only one message is ever sent here.
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
