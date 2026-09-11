"use client";

import { useRef } from "react";
import { Paperclip, X, FileCheck, FileWarning } from "lucide-react";
import { StepTitle, Badge } from "./ui";
import { formatBytes, isAllowedAttachment, MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/matching";
import type { AttachmentMode } from "@/lib/campaign";
import type { RowData } from "@/lib/excel";
import type { ColumnMapping } from "@/lib/columns";

interface Props {
  mode: AttachmentMode;
  onMode: (m: AttachmentMode) => void;
  sameFiles: File[];
  onSameFiles: (files: File[]) => void;
  onRemoveSame: (name: string) => void;
  individualFiles: File[];
  onIndividualFiles: (files: File[]) => void;
  onRemoveIndividual: (name: string) => void;
  rows: RowData[];
  mapping: ColumnMapping;
  autoMatched: Map<number, File>;
  manualMap: Record<number, string>;
  onManualMap: (rowIndex: number, fileName: string | null) => void;
  fileError: string | null;
  onFileError: (msg: string | null) => void;
}

export function getFileForRow(
  rowIndex: number,
  autoMatched: Map<number, File>,
  manualMap: Record<number, string>,
  pool: File[]
): File | null {
  const manual = manualMap[rowIndex];
  if (manual !== undefined) {
    if (manual === "__none") return null;
    return pool.find((f) => f.name === manual) ?? autoMatched.get(rowIndex) ?? null;
  }
  return autoMatched.get(rowIndex) ?? null;
}

export default function AttachmentManager(props: Props) {
  const { mode, onMode } = props;
  const sameRef = useRef<HTMLInputElement>(null);
  const indRef = useRef<HTMLInputElement>(null);

  function acceptFiles(list: FileList | null, kind: "same" | "individual") {
    if (!list) return;
    const incoming = [...list];
    for (const f of incoming) {
      if (!isAllowedAttachment(f.name)) {
        props.onFileError(`"${f.name}" is not an allowed attachment type. Use PDF, DOCX, XLSX, CSV, PNG or JPG.`);
        return;
      }
    }
    const total = incoming.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      props.onFileError("Those files exceed 20 MB in total. Please use smaller files.");
      return;
    }
    props.onFileError(null);
    if (kind === "same") {
      const existing = new Set(props.sameFiles.map((f) => f.name));
      props.onSameFiles([...props.sameFiles, ...incoming.filter((f) => !existing.has(f.name))]);
    } else {
      const existing = new Set(props.individualFiles.map((f) => f.name));
      props.onIndividualFiles([...props.individualFiles, ...incoming.filter((f) => !existing.has(f.name))]);
    }
  }

  const attachCol = props.mapping.attachment;
  const nameCol = props.mapping.name;
  const emailCol = props.mapping.email;

  return (
    <div>
      <StepTitle step="Step 4" title="Attachments" description="Choose how files are attached. No files are uploaded or stored permanently — they are attached at send time." />
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Attachment mode">
        {(
          [
            { id: "none", title: "No attachment", desc: "Plain personalized emails" },
            { id: "same", title: "Same files for everyone", desc: "Guidelines, rules, invites" },
            { id: "individual", title: "Individual file per student", desc: "Certificates, letters" },
          ] as { id: AttachmentMode; title: string; desc: string }[]
        ).map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={mode === o.id}
            onClick={() => onMode(o.id)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              mode === o.id ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900" : "border-neutral-200 bg-white hover:border-neutral-400"
            }`}
          >
            <p className="text-sm font-semibold text-neutral-900">{o.title}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{o.desc}</p>
          </button>
        ))}
      </div>

      {mode === "same" && (
        <div className="mt-4">
          <input
            ref={sameRef}
            type="file"
            multiple
            className="hidden"
            aria-label="Upload shared attachments"
            onChange={(e) => {
              acceptFiles(e.target.files, "same");
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => sameRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            <Paperclip className="h-4 w-4" aria-hidden /> Upload attachment(s)
          </button>
          {props.sameFiles.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No attachment selected.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {props.sameFiles.map((f) => (
                <li key={f.name} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                  <FileCheck className="h-4 w-4 text-emerald-600" aria-hidden />
                  <span className="flex-1 truncate font-medium text-neutral-900">{f.name}</span>
                  <span className="text-xs text-neutral-500">{formatBytes(f.size)}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => props.onRemoveSame(f.name)} className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-red-600">
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "individual" && (
        <div className="mt-4">
          {!attachCol ? (
            <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              Map the Attachment column in Step 2 first (the Excel column holding each student&apos;s file name).
            </p>
          ) : (
            <>
              <input
                ref={indRef}
                type="file"
                multiple
                className="hidden"
                aria-label="Upload individual files"
                onChange={(e) => {
                  acceptFiles(e.target.files, "individual");
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => indRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
              >
                <Paperclip className="h-4 w-4" aria-hidden /> Upload files (multiple)
              </button>
              <p className="mt-1 text-xs text-neutral-500">
                Using Attachment column “{attachCol}”. File names are matched exactly (case/space/punctuation-insensitive). Unmatched students are skipped, never sent.
              </p>
              {props.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Excel value</th>
                        <th className="px-3 py-2">Matched file</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Manual fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.rows.map((row, i) => {
                        const cell = attachCol ? String(row[attachCol] ?? "") : "";
                        const matched = getFileForRow(i, props.autoMatched, props.manualMap, props.individualFiles);
                        const name = nameCol ? String(row[nameCol] ?? "") : "";
                        const email = emailCol ? String(row[emailCol] ?? "") : "";
                        const ok = !!matched;
                        return (
                          <tr key={i} className="border-t border-neutral-100">
                            <td className="px-3 py-2">
                              <span className="font-medium text-neutral-900">{name || "(unknown)"}</span>
                              <span className="block text-xs text-neutral-500">{email}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-neutral-700">{cell || "—"}</td>
                            <td className="px-3 py-2 text-xs text-neutral-700">{matched ? matched.name : "—"}</td>
                            <td className="px-3 py-2">
                              {ok ? (
                                <Badge tone="green"><FileCheck className="h-3 w-3" aria-hidden /> Matched</Badge>
                              ) : (
                                <Badge tone="amber"><FileWarning className="h-3 w-3" aria-hidden /> Missing</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                aria-label={`Manually select file for row ${i + 2}`}
                                value={props.manualMap[i] ?? ""}
                                onChange={(e) => props.onManualMap(i, e.target.value || null)}
                                className="max-w-[180px] rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs"
                              >
                                <option value="">Auto ({matched ? matched.name : "no match"})</option>
                                <option value="__none">No file (skip)</option>
                                {props.individualFiles.map((f) => (
                                  <option key={f.name} value={f.name}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {props.individualFiles.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-neutral-600">Uploaded files ({props.individualFiles.length})</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {props.individualFiles.map((f) => (
                      <li key={f.name} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs">
                        <span className="max-w-[220px] truncate font-medium">{f.name}</span>
                        <span className="text-neutral-400">{formatBytes(f.size)}</span>
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => props.onRemoveIndividual(f.name)} className="text-neutral-400 hover:text-red-600">
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {props.fileError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {props.fileError}
        </p>
      )}
    </div>
  );
}
