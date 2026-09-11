"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, Rocket, RotateCcw, TriangleAlert } from "lucide-react";
import GmailHeader from "@/components/GmailHeader";
import ExcelUploader from "@/components/ExcelUploader";
import ColumnMapper from "@/components/ColumnMapper";
import CampaignComposer from "@/components/CampaignComposer";
import AttachmentManager, { getFileForRow } from "@/components/AttachmentManager";
import EmailPreview from "@/components/EmailPreview";
import TestEmail from "@/components/TestEmail";
import { SendProgress, ConfirmModal, ResultsTable } from "@/components/SendWidgets";
import { Button, Card, Badge } from "@/components/ui";
import type { ColumnMapping } from "@/lib/columns";
import { validateRows, type RowData } from "@/lib/excel";
import { renderTemplate, findMissingVariables } from "@/lib/personalization";
import { matchFilesToRows } from "@/lib/matching";
import {
  fileToBase64,
  resultsToCsv,
  type AttachmentMode,
  type CampaignData,
  type RecipientResult,
} from "@/lib/campaign";

const STEPS = ["Upload", "Compose", "Personalize", "Attach", "Preview", "Send"];

export default function Home() {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: null, email: null, domain: null, role: null, attachment: null });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<AttachmentMode>("none");
  const [sameFiles, setSameFiles] = useState<File[]>([]);
  const [individualFiles, setIndividualFiles] = useState<File[]>([]);
  const [manualMap, setManualMap] = useState<Record<number, string>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [gmail, setGmail] = useState({ connected: false, email: "" });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [results, setResults] = useState<RecipientResult[] | null>(null);
  const sendingRef = useRef(false);
  const campaignRunId = useRef(0);

  // ---- derived ----
  const headers = useMemo(() => campaign?.headers ?? [], [campaign]);
  const rows = useMemo(() => campaign?.rows ?? [], [campaign]);

  const cellValues = useMemo(
    () => rows.map((r) => (mapping.attachment ? String(r[mapping.attachment] ?? "") : "")),
    [rows, mapping.attachment]
  );

  const autoMatched = useMemo(
    () => (mode === "individual" ? matchFilesToRows(cellValues, individualFiles).matched : new Map<number, File>()),
    [mode, cellValues, individualFiles]
  );

  const fileForRow = useCallback(
    (i: number) => getFileForRow(i, autoMatched, manualMap, individualFiles),
    [autoMatched, manualMap, individualFiles]
  );

  const individualMatchedSet = useMemo(() => {
    const s = new Set<number>();
    rows.forEach((_, i) => {
      if (fileForRow(i)) s.add(i);
    });
    return s;
  }, [rows, fileForRow]);

  const validation = useMemo(() => {
    if (!campaign) return null;
    return validateRows(rows, headers, mapping, {
      subject,
      body,
      attachmentMode: mode,
      individualMatched: individualMatchedSet,
    });
  }, [campaign, rows, headers, mapping, subject, body, mode, individualMatchedSet]);

  const rowValid = useMemo(
    () => validation?.rowStatus.map((s) => s === "valid") ?? [],
    [validation]
  );
  const validIndexes = useMemo(() => rows.map((_, i) => i).filter((i) => rowValid[i]), [rows, rowValid]);

  const missingVars = useMemo(
    () => (campaign ? findMissingVariables(`${subject}\n${body}`, headers, mapping) : []),
    [campaign, subject, body, headers, mapping]
  );

  const stepIndex = useMemo(() => {
    if (results) return 5;
    if (sending) return 5;
    if (validIndexes.length > 0 && subject.trim() && body.trim()) return 4;
    if (campaign) return 2;
    return 0;
  }, [results, sending, validIndexes.length, subject, body, campaign]);

  // ---- actions ----
  function handleLoaded(data: { fileName: string; headers: string[]; rows: RowData[]; mapping: ColumnMapping }) {
    setCampaign({ headers: data.headers, rows: data.rows, mapping: data.mapping, fileName: data.fileName });
    setMapping(data.mapping);
    setManualMap({});
    setResults(null);
  }

  function clearCampaign() {
    setCampaign(null);
    setMapping({ name: null, email: null, domain: null, role: null, attachment: null });
    setManualMap({});
    setResults(null);
  }

  function resetAll() {
    if (sendingRef.current) return;
    clearCampaign();
    setSubject("");
    setBody("");
    setMode("none");
    setSameFiles([]);
    setIndividualFiles([]);
    setFileError(null);
    setConfirmOpen(false);
    setSending(false);
    setProgress({ done: 0, total: 0, current: "" });
    setResults(null);
  }

  const b64Cache = useRef(new Map<string, string>());
  async function cachedB64(file: File): Promise<string> {
    const hit = b64Cache.current.get(file.name + file.size);
    if (hit) return hit;
    const b64 = await fileToBase64(file);
    b64Cache.current.set(file.name + file.size, b64);
    return b64;
  }

  async function attachmentsFor(i: number) {
    const files = mode === "same" ? sameFiles : mode === "individual" ? (fileForRow(i) ? [fileForRow(i)!] : []) : [];
    return Promise.all(
      files.map(async (f) => ({ filename: f.name, mimeType: f.type || "application/octet-stream", contentBase64: await cachedB64(f) }))
    );
  }

  function personalize(i: number) {
    const row = rows[i];
    return {
      to: mapping.email ? String(row[mapping.email] ?? "").trim() : "",
      subject: renderTemplate(subject, row, headers, mapping),
      bodyText: renderTemplate(body, row, headers, mapping),
      name: mapping.name ? String(row[mapping.name] ?? "") : "",
      domain: mapping.domain ? String(row[mapping.domain] ?? "") : "",
    };
  }

  async function handleTestSend(testAddress: string): Promise<{ ok: boolean; error?: string }> {
    if (validIndexes.length === 0) return { ok: false, error: "No valid recipients to base the test on." };
    const i = validIndexes[0];
    const p = personalize(i);
    const attachments = await attachmentsFor(i);
    const res = await fetch("/api/gmail/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testAddress, subject: p.subject, bodyText: p.bodyText, attachments }),
    });
    const data = await res.json();
    return data.ok ? { ok: true } : { ok: false, error: data.error ?? "Test email failed." };
  }

  async function handleSendAll() {
    if (sendingRef.current) return; // duplicate protection
    if (validIndexes.length === 0) return;
    sendingRef.current = true;
    const runId = ++campaignRunId.current;
    setSending(true);
    setConfirmOpen(false);
    setResults(null);

    const initial: RecipientResult[] = rows.map((_, i) => {
      const p = rows[i];
      const name = mapping.name ? String(p[mapping.name] ?? "") : "";
      const email = mapping.email ? String(p[mapping.email] ?? "") : "";
      const domain = mapping.domain ? String(p[mapping.domain] ?? "") : "";
      const valid = rowValid[i];
      return {
        index: i,
        name,
        email,
        domain,
        attachmentName:
          mode === "same"
            ? sameFiles.map((f) => f.name).join(", ") || null
            : mode === "individual"
              ? (fileForRow(i)?.name ?? null)
              : null,
        status: valid ? ("ready" as const) : ("skipped" as const),
        error: valid ? undefined : (validation?.rowProblems[i] ?? "Skipped"),
        time: valid ? undefined : new Date().toISOString(),
      };
    });
    setResults(initial);
    setProgress({ done: 0, total: validIndexes.length, current: "" });

    let done = 0;
    let stoppedByQuota = false;

    for (const i of validIndexes) {
      if (campaignRunId.current !== runId) break; // reset happened
      const p = personalize(i);
      setResults((prev) =>
        prev ? prev.map((r) => (r.index === i ? { ...r, status: "sending" as const } : r)) : prev
      );
      setProgress({ done, total: validIndexes.length, current: p.name || p.to });

      try {
        const attachments = await attachmentsFor(i);
        const res = await fetch("/api/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: p.to, subject: p.subject, bodyText: p.bodyText, attachments }),
        });
        const data = await res.json();
        const now = new Date().toISOString();
        if (data.ok) {
          setResults((prev) =>
            prev ? prev.map((r) => (r.index === i ? { ...r, status: "sent" as const, error: undefined, time: now } : r)) : prev
          );
        } else if (data.code === "QUOTA") {
          stoppedByQuota = true;
          setResults((prev) =>
            prev
              ? prev.map((r) =>
                  r.index === i
                    ? { ...r, status: "failed" as const, error: data.error, time: now }
                    : r.status === "ready"
                      ? { ...r, status: "skipped" as const, error: "Not processed — Gmail rate limit reached.", time: now }
                      : r
                )
              : prev
          );
          break;
        } else {
          setResults((prev) =>
            prev ? prev.map((r) => (r.index === i ? { ...r, status: "failed" as const, error: data.error ?? "Send failed", time: now } : r)) : prev
          );
        }
      } catch {
        setResults((prev) =>
          prev ? prev.map((r) => (r.index === i ? { ...r, status: "failed" as const, error: "Network error", time: new Date().toISOString() } : r)) : prev
        );
      }
      done += 1;
      setProgress({ done, total: validIndexes.length, current: "" });
      // Gentle pacing to respect Gmail quotas
      await new Promise((r) => setTimeout(r, 400));
    }

    if (stoppedByQuota) {
      setProgress((p) => ({ ...p, current: "Stopped — Gmail rate limit." }));
    }
    sendingRef.current = false;
    setSending(false);
  }

  function downloadReport() {
    if (!results || !campaign) return;
    const csv = resultsToCsv(results, campaign);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecell-automation-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canSend =
    gmail.connected && validIndexes.length > 0 && subject.trim() !== "" && body.trim() !== "" && missingVars.length === 0 && !sending;

  const attachmentNote =
    mode === "none"
      ? "None"
      : mode === "same"
        ? `${sameFiles.length} shared file(s) to everyone`
        : `${individualMatchedSet.size} individual file(s)`;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <GmailHeader onStatus={setGmail} />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        {/* Workflow stepper */}
        <nav aria-label="Workflow progress" className="flex flex-wrap items-center gap-1.5 text-xs">
          {STEPS.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className={`rounded-full px-2.5 py-1 font-medium ${
                  i < stepIndex
                    ? "bg-emerald-100 text-emerald-800"
                    : i === stepIndex
                      ? "bg-neutral-900 text-white"
                      : "bg-white text-neutral-500 ring-1 ring-neutral-200"
                }`}
              >
                {i + 1}. {s}
              </span>
              {i < STEPS.length - 1 && <span className="text-neutral-300">→</span>}
            </span>
          ))}
        </nav>

        {!gmail.connected && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Connect your Gmail account to send emails. Your password is never requested or stored — sign-in uses Google OAuth.
          </div>
        )}

        {missingVars.length > 0 && campaign && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>⚠️ Missing required variable{missingVars.length === 1 ? "" : "s"}: {missingVars.map((v) => `[${v}]`).join(", ")}. Map a column, or remove the variable from the template.</span>
          </div>
        )}

        <Card>
          <ExcelUploader
            fileName={campaign?.fileName ?? null}
            headers={headers}
            rowCount={rows.length}
            onLoaded={handleLoaded}
            onClear={clearCampaign}
          />
        </Card>

        {campaign && (
          <Card>
            <ColumnMapper headers={headers} mapping={mapping} onChange={setMapping} summary={validation ? { total: validation.summary.total, valid: validation.summary.valid, invalid: validation.summary.invalid } : null} />
          </Card>
        )}

        {campaign && (
          <Card>
            <CampaignComposer subject={subject} body={body} headers={headers} onSubject={setSubject} onBody={setBody} />
          </Card>
        )}

        {campaign && (
          <Card>
            <AttachmentManager
              mode={mode}
              onMode={setMode}
              sameFiles={sameFiles}
              onSameFiles={setSameFiles}
              onRemoveSame={(name) => setSameFiles((f) => f.filter((x) => x.name !== name))}
              individualFiles={individualFiles}
              onIndividualFiles={setIndividualFiles}
              onRemoveIndividual={(name) => setIndividualFiles((f) => f.filter((x) => x.name !== name))}
              rows={rows}
              mapping={mapping}
              autoMatched={autoMatched}
              manualMap={manualMap}
              onManualMap={(rowIndex, fileName) =>
                setManualMap((m) => {
                  const next = { ...m };
                  if (fileName === null) delete next[rowIndex];
                  else next[rowIndex] = fileName;
                  return next;
                })
              }
              fileError={fileError}
              onFileError={setFileError}
            />
          </Card>
        )}

        {campaign && (
          <Card>
            <EmailPreview
              rows={rows}
              headers={headers}
              mapping={mapping}
              subject={subject}
              body={body}
              mode={mode}
              sameFiles={sameFiles}
              fileForRow={fileForRow}
              rowValid={rowValid}
            />
          </Card>
        )}

        {campaign && (
          <Card>
            <TestEmail
              disabled={!gmail.connected || validIndexes.length === 0 || !subject.trim() || !body.trim()}
              disabledReason={
                !gmail.connected
                  ? "Connect your Gmail account to send emails."
                  : validIndexes.length === 0
                    ? "No valid recipients yet — fix the flagged rows first."
                    : "Write your subject and message first."
              }
              onSend={handleTestSend}
            />
          </Card>
        )}

        {campaign && !results && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Send Campaign</h2>
                <p className="mt-1 flex flex-wrap gap-2 text-sm text-neutral-600">
                  <Badge tone="blue">{validIndexes.length} ready</Badge>
                  {rows.length - validIndexes.length > 0 && <Badge tone="amber">{rows.length - validIndexes.length} skipped</Badge>}
                  {!gmail.connected && <Badge tone="red">Gmail not connected</Badge>}
                </p>
                <p className="mt-2 text-xs text-neutral-500">Preview → test → confirm → send. Sending is subject to Gmail account limits and Google API quotas.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={resetAll} disabled={sending}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> Reset
                </Button>
                <Button onClick={() => setConfirmOpen(true)} disabled={!canSend}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Rocket className="h-4 w-4" aria-hidden />}
                  {sending ? `Sending ${progress.done} / ${progress.total}…` : `Send ${validIndexes.length} Email${validIndexes.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
            {sending && (
              <div className="mt-4">
                <SendProgress done={progress.done} total={progress.total} currentName={progress.current} />
              </div>
            )}
          </Card>
        )}

        {sending && results && (
          <Card>
            <SendProgress done={progress.done} total={progress.total} currentName={progress.current} />
            <p className="mt-3 text-sm text-neutral-600">Live results appear below when the campaign finishes. Do not refresh — sending continues in this tab.</p>
          </Card>
        )}

        {results && !sending && campaign && (
          <Card>
            <ResultsTable results={results} onDownload={downloadReport} onReset={resetAll} />
          </Card>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <p className="text-center text-xs text-neutral-400">
          Ecell Automation · Internal tool · Student data is processed in your browser and never stored permanently.
        </p>
      </footer>

      {confirmOpen && (
        <ConfirmModal
          sender={gmail.email}
          valid={validIndexes.length}
          skipped={rows.length - validIndexes.length}
          attachmentNote={attachmentNote}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleSendAll}
          sending={sending}
        />
      )}
    </div>
  );
}
