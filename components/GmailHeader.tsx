"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Mail, ChevronDown, Loader2, LogOut, User } from "lucide-react";

export default function GmailHeader({ onStatus }: { onStatus: (s: { connected: boolean; email: string }) => void }) {
  const { status } = useSession();
  const [gmail, setGmail] = useState<{ connected: boolean; email: string }>({ connected: false, email: "" });
  const [checking, setChecking] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        // Never cache auth status: a stale "not configured" response must not survive a fix + refresh.
        const res = await fetch("/api/gmail/status", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          const s = { connected: !!data.connected, email: data.email ?? "" };
          setGmail(s);
          onStatus(s);
          setSetupError(data.configured === false ? (data.error ?? "Google OAuth is not configured.") : null);
        }
      } catch {
        if (!cancelled) {
          setGmail({ connected: false, email: "" });
          onStatus({ connected: false, email: "" });
          setSetupError(null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-neutral-900">Ecell Automation</h1>
          <p className="hidden text-xs text-neutral-500 sm:block">Personalized bulk email automation for E-Cell.</p>
        </div>
        <div>
          {checking ? (
            <span className="inline-flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Connecting Gmail…
            </span>
          ) : gmail.connected ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Gmail Connected
                <span className="hidden max-w-[220px] truncate font-normal text-emerald-700 sm:inline">{gmail.email}</span>
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600">
                    <User className="h-4 w-4" aria-hidden />
                    <span className="truncate">{gmail.email}</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut({ callbackUrl: "/" });
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden /> Disconnect Gmail
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => void signIn("google", { callbackUrl: "/" })}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                <Mail className="h-4 w-4" aria-hidden /> Connect Gmail
              </button>
              {setupError && (
                <p role="alert" className="max-w-[260px] text-right text-xs text-red-600">
                  {setupError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
