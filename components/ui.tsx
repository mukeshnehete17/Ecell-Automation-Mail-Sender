"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-neutral-900 text-white hover:bg-neutral-700",
        variant === "secondary" && "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        variant === "ghost" && "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function StepTitle({ step, title, description }: { step: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{step}</p>
      <h2 className="mt-1 text-lg font-semibold text-neutral-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "red" | "amber" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-neutral-100 text-neutral-700",
        tone === "green" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        tone === "red" && "bg-red-50 text-red-700 ring-1 ring-red-200",
        tone === "amber" && "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
        tone === "blue" && "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
      )}
    >
      {children}
    </span>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label="Sending progress"
    >
      <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
