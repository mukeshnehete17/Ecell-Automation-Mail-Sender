"use client";

import { StepTitle, Badge } from "./ui";
import type { ColumnMapping, MappedField } from "@/lib/columns";
import type { InvalidRow } from "@/lib/excel";

interface Props {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
  summary: { total: number; valid: number; invalid: InvalidRow[] } | null;
}

const FIELDS: { field: MappedField; label: string; required: boolean; hint: string }[] = [
  { field: "email", label: "Email", required: true, hint: "Mandatory" },
  { field: "name", label: "Student Name", required: false, hint: "Required if you use [Name] / [Student Name]" },
  { field: "domain", label: "Domain", required: false, hint: "Required if you use [Domain]" },
  { field: "role", label: "Role", required: false, hint: "Required if you use [Role]" },
  { field: "attachment", label: "Attachment", required: false, hint: "Required for individual attachments" },
];

export default function ColumnMapper({ headers, mapping, onChange, summary }: Props) {
  if (headers.length === 0) return null;

  return (
    <div>
      <StepTitle step="Step 2" title="Map Your Columns" description="We auto-detected your columns. Correct anything that looks wrong — only Email is strictly mandatory." />
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ field, label, required, hint }) => (
          <div key={field}>
            <label htmlFor={`map-${field}`} className="mb-1.5 block text-sm font-medium text-neutral-700">
              {label} {required ? <span className="text-red-600">*</span> : <span className="font-normal text-neutral-400">(optional)</span>}
            </label>
            <select
              id={`map-${field}`}
              value={mapping[field] ?? ""}
              onChange={(e) => onChange({ ...mapping, [field]: e.target.value || null })}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              <option value="">{required ? "Select column…" : "Skip…"}</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">{hint}</p>
          </div>
        ))}
      </div>

      {summary && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-neutral-900">{summary.total} total rows</span>
            <Badge tone="green">{summary.valid} valid</Badge>
            {summary.total - summary.valid > 0 && (
              <Badge tone="red">{summary.total - summary.valid} invalid / skipped</Badge>
            )}
          </div>
          {summary.invalid.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-1 pr-3">Row</th>
                    <th className="py-1 pr-3">Student</th>
                    <th className="py-1 pr-3">Email</th>
                    <th className="py-1">Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.invalid.slice(0, 20).map((r) => (
                    <tr key={r.rowNumber} className="border-t border-neutral-200">
                      <td className="py-1.5 pr-3 text-neutral-500">{r.rowNumber}</td>
                      <td className="py-1.5 pr-3 font-medium text-neutral-900">{r.name}</td>
                      <td className="py-1.5 pr-3 text-neutral-600">{r.email || "—"}</td>
                      <td className="py-1.5 text-red-700">{r.problem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.invalid.length > 20 && (
                <p className="mt-2 text-xs text-neutral-500">…and {summary.invalid.length - 20} more. Invalid recipients will be skipped, never sent.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
