// Server-side MIME construction for Gmail API. Node only.

import sanitizeHtml from "sanitize-html";
import { textToHtml } from "./email-format";

export interface AttachmentPayload {
  filename: string;
  mimeType: string;
  contentBase64: string; // standard base64
}

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "ul", "ol", "li", "strong", "em", "b", "i", "u", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

export function composeHtmlBody(bodyText: string): string {
  return sanitizeEmailHtml(textToHtml(bodyText));
}

function base64UrlEncode(input: string | Buffer): string {
  const b64 = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Encode a header parameter value (e.g. attachment filename) per RFC 2047 when
 * it contains non-ASCII characters (Indian names, multilingual filenames).
 * ASCII names are passed through quoted; quotes/backslashes are stripped to
 * prevent header injection.
 */
export function encodeHeaderParam(value: string): string {
  const safe = value.replace(/["\\\r\n]/g, "");
  if (/^[\x20-\x7e]*$/.test(safe)) return `"${safe}"`;
  return `"=?UTF-8?B?${Buffer.from(safe, "utf-8").toString("base64")}?="`;
}

function mimeTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    zip: "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}

export { mimeTypeFor };

export function buildRawMessage(opts: {
  to: string;
  subject: string;
  bodyText: string;
  attachments: AttachmentPayload[];
}): string {
  const { to, subject, bodyText } = opts;
  const attachments = opts.attachments ?? [];

  // RFC 2047 encode subject for Unicode
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  const plain = bodyText.replace(/\r\n/g, "\n");
  const html = composeHtmlBody(bodyText);

  const boundaryMixed = `mixed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const boundaryAlt = `alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

  const lines: string[] = [];
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${encodedSubject}`);
  lines.push("MIME-Version: 1.0");

  const hasAttachments = attachments.length > 0;
  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundaryMixed}"`);
    lines.push("");
    lines.push(`--${boundaryMixed}`);
  }
  lines.push(`Content-Type: multipart/alternative; boundary="${boundaryAlt}"`);
  lines.push("");
  // plain part
  lines.push(`--${boundaryAlt}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(Buffer.from(plain, "utf-8").toString("base64").replace(/(.{76})/g, "$1\r\n"));
  // html part
  lines.push(`--${boundaryAlt}`);
  lines.push('Content-Type: text/html; charset="UTF-8"');
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  const htmlDoc = `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a;">${html}</div>`;
  lines.push(Buffer.from(htmlDoc, "utf-8").toString("base64").replace(/(.{76})/g, "$1\r\n"));
  lines.push(`--${boundaryAlt}--`);

  for (const att of attachments) {
    const mimeType = att.mimeType || mimeTypeFor(att.filename);
    // Strip whitespace from base64 chunks
    const clean = att.contentBase64.replace(/\s/g, "");
    const encodedName = encodeHeaderParam(att.filename);
    lines.push(`--${boundaryMixed}`);
    lines.push(`Content-Type: ${mimeType}; name=${encodedName}`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(`Content-Disposition: attachment; filename=${encodedName}`);
    lines.push("");
    lines.push(clean.replace(/(.{76})/g, "$1\r\n"));
  }
  if (hasAttachments) lines.push(`--${boundaryMixed}--`);

  const raw = lines.join("\r\n");
  return base64UrlEncode(raw);
}
