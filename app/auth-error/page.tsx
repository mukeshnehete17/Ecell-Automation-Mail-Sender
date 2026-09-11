import { Suspense } from "react";
import AuthErrorContent from "./content";

export const metadata = {
  title: "Gmail connection issue — Ecell Automation",
};

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <Suspense fallback={<div className="text-sm text-neutral-500">Loading…</div>}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
