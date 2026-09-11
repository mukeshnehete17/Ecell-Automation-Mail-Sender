"use client";

import { CheckCircle2, XCircle, MinusCircle, Loader2 } from "lucide-react";
import { Progress, Badge, Button, Modal } from "./ui";
import type { RecipientResult } from "@/lib/campaign";

export function SendProgress({ done, total, currentName }: { done: number; total: number; currentName: string }) {
  return (
    <div aria-live="polite" className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-sm font-medium text-neutral-900">Sending emails… {done} / {total}</p>
      <div className="mt-2">
        <Progress value={done} max={total} />
      </div>
      {currentName && <p className="mt-2 text-xs text-neutral-600">Current recipient: {currentName} — Sending…</p>}
    </div>
  );
}

export function ConfirmModal({
  sender, valid, skipped, attachmentNote, onCancel, onConfirm, sending,
}: {
  sender: string;
  valid: number;
  skipped: number;
  attachmentNote: string;
  onCancel: () => void;
  onConfirm: () => void;
  sending: boolean;
}) {
  return (
    <Modal title="Ready to Send" onClose={onCancel}>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-neutral-500">Sender</dt><dd className="font-medium text-neutral-900">{sender}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-neutral-500">Recipients</dt><dd className="font-medium text-neutral-900">{valid + skipped}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-neutral-500">Valid</dt><dd className="font-medium text-emerald-700">{valid}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-neutral-500">Skipped</dt><dd className="font-medium text-amber-700">{skipped}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-neutral-500">Attachments</dt><dd className="text-right font-medium text-neutral-900">{attachmentNote}</dd></div>
      </dl>
      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
        You are about to send {valid} email{valid === 1 ? "" : "s"}. This action cannot be automatically undone.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={sending}>Cancel</Button>
        <Button onClick={onConfirm} disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Confirm &amp; Send {valid} Email{valid === 1 ? "" : "s"}
        </Button>
      </div>
    </Modal>
  );
}

export function ResultsTable({
  results, onDownload, onReset,
}: {
  results: RecipientResult[];
  onDownload: () => void;
  onReset: () => void;
}) {
  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900">Campaign Complete 🎉</h2>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Badge>Total: {results.length}</Badge>
        <Badge tone="green">Sent: {sent}</Badge>
        {failed > 0 && <Badge tone="red">Failed: {failed}</Badge>}
        {skipped > 0 && <Badge tone="amber">Skipped: {skipped}</Badge>}
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Attachment</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.index} className="border-t border-neutral-100">
                <td className="px-3 py-2 font-medium text-neutral-900">{r.name || "(unknown)"}</td>
                <td className="px-3 py-2 text-neutral-600">{r.email}</td>
                <td className="px-3 py-2">
                  {r.status === "sent" && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> Sent</span>}
                  {r.status === "failed" && <span className="inline-flex items-center gap-1 text-red-700"><XCircle className="h-4 w-4" aria-hidden /> Failed</span>}
                  {r.status === "skipped" && <span className="inline-flex items-center gap-1 text-amber-700"><MinusCircle className="h-4 w-4" aria-hidden /> Skipped</span>}
                  {r.status === "sending" && <Loader2 className="h-4 w-4 animate-spin text-neutral-500" aria-hidden />}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-neutral-600">{r.attachmentName ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-red-700">{r.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onDownload}>Download Report (CSV)</Button>
        <Button variant="secondary" onClick={onReset}>Start New Campaign</Button>
      </div>
    </div>
  );
}
