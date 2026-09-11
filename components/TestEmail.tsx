"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button, StepTitle, inputClass } from "./ui";

interface Props {
  disabled: boolean;
  disabledReason: string | null;
  onSend: (testAddress: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function TestEmail({ disabled, disabledReason, onSend }: Props) {
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSend() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address.trim())) {
      setResult({ ok: false, message: "Enter a valid test email address." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const r = await onSend(address.trim());
      setResult(r.ok ? { ok: true, message: "Test email sent successfully. Check the inbox (and spam folder)." } : { ok: false, message: r.error ?? "Test email failed." });
    } catch {
      setResult({ ok: false, message: "Test email failed due to a network error." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <StepTitle step="Step 6" title="Send Test Email" description="Send exactly one real email using a real recipient's personalized data. Check the inbox before bulk sending." />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          className={inputClass}
          placeholder="you@example.com"
          aria-label="Test email address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={disabled || sending}
        />
        <Button onClick={handleSend} disabled={disabled || sending} className="shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {sending ? "Sending test email…" : "Send Test Email"}
        </Button>
      </div>
      {disabled && disabledReason && <p className="mt-2 text-sm text-neutral-500">{disabledReason}</p>}
      {result && (
        <p role="status" className={`mt-2 flex items-center gap-1.5 text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
          {result.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
          {result.ok ? "✓ " : "✕ "}{result.message}
        </p>
      )}
    </div>
  );
}
