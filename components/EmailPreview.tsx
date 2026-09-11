"use client";

import { useMemo, useState } from "react";
import { StepTitle, Badge } from "./ui";
import { renderTemplate } from "@/lib/personalization";
import { textToHtml } from "@/lib/email-format";
import type { RowData } from "@/lib/excel";
import type { ColumnMapping } from "@/lib/columns";
import type { AttachmentMode } from "@/lib/campaign";

interface Props {
  rows: RowData[];
  headers: string[];
  mapping: ColumnMapping;
  subject: string;
  body: string;
  mode: AttachmentMode;
  sameFiles: File[];
  fileForRow: (i: number) => File | null;
  rowValid: boolean[];
}

export default function EmailPreview(props: Props) {
  const { rows } = props;
  const [index, setIndex] = useState(0);
  const validIndexes = useMemo(() => rows.map((_, i) => i).filter((i) => props.rowValid[i]), [rows, props.rowValid]);

  if (rows.length === 0) {
    return (
      <div>
        <StepTitle step="Step 5" title="Preview" description="Verify personalization before sending." />
        <p className="text-sm text-neutral-500">Write your email message before previewing.</p>
      </div>
    );
  }

  const safeIndex = validIndexes.includes(index) ? index : (validIndexes[0] ?? 0);
  const row = rows[safeIndex] ?? {};
  const emailCol = props.mapping.email;
  const to = emailCol ? String(row[emailCol] ?? "") : "";
  const renderedSubject = renderTemplate(props.subject || "(no subject)", row, props.headers, props.mapping);
  const renderedBody = renderTemplate(props.body || "(no message)", row, props.headers, props.mapping);
  const individualFile = props.mode === "individual" ? props.fileForRow(safeIndex) : null;
  const attachments = props.mode === "same" ? props.sameFiles : individualFile ? [individualFile] : [];

  const previewRows = validIndexes.slice(0, 5);

  return (
    <div>
      <StepTitle step="Step 5" title="Preview" description="Verify personalization before sending. Sending is subject to Gmail account limits and Google API quotas." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="preview-recipient" className="text-sm font-medium text-neutral-700">
          Preview recipient:
        </label>
        <select
          id="preview-recipient"
          value={safeIndex}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        >
          {validIndexes.map((i) => {
            const r = rows[i];
            const name = props.mapping.name ? String(r[props.mapping.name] ?? "") : `Recipient ${i + 1}`;
            return (
              <option key={i} value={i}>
                {name || `Recipient ${i + 1}`}
              </option>
            );
          })}
        </select>
        {validIndexes.length === 0 && <Badge tone="red">No valid recipients</Badge>}
      </div>

      {validIndexes.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
            <p><span className="font-medium text-neutral-500">To: </span><span className="text-neutral-900">{to}</span></p>
            <p className="mt-1"><span className="font-medium text-neutral-500">Subject: </span><span className="font-medium text-neutral-900">{renderedSubject}</span></p>
          </div>
          <div
            className="prose-sm px-4 py-4 text-sm leading-relaxed text-neutral-900 [&_a]:text-blue-700 [&_a]:underline [&_p]:my-2 [&_ul]:ml-5 [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: textToHtml(renderedBody) }}
          />
          <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
            Attachments: {attachments.length > 0 ? attachments.map((f) => f.name).join(", ") : "None"}
          </div>
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Attachment</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((i) => {
                const r = rows[i];
                const name = props.mapping.name ? String(r[props.mapping.name] ?? "") : "";
                const email = emailCol ? String(r[emailCol] ?? "") : "";
                const domain = props.mapping.domain ? String(r[props.mapping.domain] ?? "") : "";
                const att = props.mode === "same" ? props.sameFiles.map((f) => f.name).join(", ") || "—" : props.mode === "individual" ? (props.fileForRow(i)?.name ?? "—") : "—";
                return (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-medium text-neutral-900">{name}</td>
                    <td className="px-3 py-2 text-neutral-600">{email}</td>
                    <td className="px-3 py-2 text-neutral-600">{domain || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-600">{att}</td>
                    <td className="px-3 py-2"><Badge tone="blue">Ready</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {validIndexes.length > 5 && (
            <p className="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-500">
              Showing 5 of {validIndexes.length} valid recipients.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
