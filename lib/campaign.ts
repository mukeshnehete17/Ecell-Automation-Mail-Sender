// Shared campaign types + client helpers.
import type { ColumnMapping } from "./columns";
import type { RowData } from "./excel";

export type AttachmentMode = "none" | "same" | "individual";

export type RecipientStatus = "ready" | "sending" | "sent" | "failed" | "skipped";

export interface RecipientResult {
  index: number; // row index (0-based)
  name: string;
  email: string;
  domain: string;
  attachmentName: string | null;
  status: RecipientStatus;
  error?: string;
}

export interface CampaignData {
  headers: string[];
  rows: RowData[];
  mapping: ColumnMapping;
  fileName: string;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is data:<type>;base64,<data>
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Could not read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function resultsToCsv(results: RecipientResult[], campaign: CampaignData): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Student Name", "Email", "Domain", "Role", "Attachment", "Status", "Error"];
  const lines = [header.map(esc).join(",")];
  for (const r of results) {
    const row = campaign.rows[r.index] ?? {};
    const role = campaign.mapping.role ? String(row[campaign.mapping.role] ?? "") : "";
    lines.push(
      [r.name, r.email, r.domain, role, r.attachmentName ?? "", r.status, r.error ?? ""].map(esc).join(",")
    );
  }
  return lines.join("\r\n");
}
