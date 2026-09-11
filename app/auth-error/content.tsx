"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";

const MESSAGES: Record<string, string> = {
  AccessDenied: "Google authorization was cancelled. No emails were sent. You can try connecting again whenever you're ready.",
  OAuthCallback: "Unable to connect Gmail. Please try again.",
  OAuthSignin: "Unable to start Google sign-in. Please try again.",
  OAuthCreateAccount: "Unable to connect Gmail. Please try again.",
  Callback: "Unable to connect Gmail. Please try again.",
  Configuration: "Gmail connection is not configured on this deployment. Please contact the administrator.",
};

export default function AuthErrorContent() {
  const params = useSearchParams();
  const code = params.get("error") ?? "";
  const message = MESSAGES[code] ?? "Unable to connect Gmail. Please try again.";

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
      <TriangleAlert className="mx-auto h-8 w-8 text-amber-500" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold text-neutral-900">Gmail connection issue</h1>
      <p className="mt-2 text-sm text-neutral-600">{message}</p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Back to Ecell Automation
      </Link>
    </div>
  );
}
