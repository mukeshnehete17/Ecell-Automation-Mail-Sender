// Shared single-email send logic used by /api/gmail/send and /api/gmail/test.
import { gmailClient, getGmailContext, isQuotaError, isAuthError } from "./gmail";
import { buildRawMessage, type AttachmentPayload } from "./mime";

export interface SendPayload {
  to?: string;
  subject?: string;
  bodyText?: string;
  attachments?: AttachmentPayload[];
}

export const MAX_ATTACHMENTS = 5;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export async function sendOneEmail(payload: SendPayload): Promise<{
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}> {
  const ctx = await getGmailContext();
  if (!ctx) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: "Gmail is not connected. Please connect Gmail first.",
        code: "NOT_CONNECTED",
      },
    };
  }

  const to = (payload.to ?? "").trim();
  const subject = (payload.subject ?? "").trim();
  const bodyText = payload.bodyText ?? "";
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to))
    return { ok: false, status: 400, body: { ok: false, error: "Invalid recipient email address." } };
  if (!subject) return { ok: false, status: 400, body: { ok: false, error: "Subject is required." } };
  if (!bodyText.trim() && attachments.length === 0)
    return { ok: false, status: 400, body: { ok: false, error: "Message body is empty." } };
  if (attachments.length > MAX_ATTACHMENTS)
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: `Too many attachments (max ${MAX_ATTACHMENTS} per email).` },
    };

  let totalBytes = 0;
  for (const a of attachments) {
    if (!a.filename || !a.contentBase64)
      return { ok: false, status: 400, body: { ok: false, error: "Attachment is missing filename or content." } };
    if (a.filename.length > 200)
      return { ok: false, status: 400, body: { ok: false, error: `Attachment filename too long: ${a.filename}` } };
    totalBytes += Math.floor((a.contentBase64.length * 3) / 4);
  }
  if (totalBytes > MAX_TOTAL_BYTES)
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Attachments exceed the 20 MB per-email limit. Please use smaller files." },
    };

  try {
    const gmail = gmailClient(ctx.accessToken, ctx.refreshToken);
    const raw = buildRawMessage({ to, subject, bodyText, attachments });
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    return { ok: true, status: 200, body: { ok: true, from: ctx.email } };
  } catch (err: unknown) {
    console.error("Gmail send failed:", err instanceof Error ? err.message : err);
    if (isAuthError(err)) {
      return {
        ok: false,
        status: 401,
        body: {
          ok: false,
          error: "Gmail authentication expired. Please disconnect and reconnect Gmail.",
          code: "AUTH_EXPIRED",
        },
      };
    }
    if (isQuotaError(err)) {
      return {
        ok: false,
        status: 429,
        body: {
          ok: false,
          error:
            "Gmail has temporarily limited sending. Emails sent so far succeeded; remaining emails were not processed.",
          code: "QUOTA",
        },
      };
    }
    const message = err instanceof Error ? err.message : "Unknown Gmail error";
    return { ok: false, status: 502, body: { ok: false, error: `Gmail error: ${message}`, code: "GMAIL_ERROR" } };
  }
}
