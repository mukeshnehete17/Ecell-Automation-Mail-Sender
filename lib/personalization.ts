// Variable extraction + substitution. Client-safe (no Node deps).
// Variables look like [Student Name], [Domain], [Any Column Header].

import type { ColumnMapping } from "./columns";

export function extractVariables(template: string): string[] {
  const vars: string[] = [];
  const seen = new Set<string>();
  const re = /\[([^\[\]\n\r]{1,60})\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    const name = m[1].trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      vars.push(name);
    }
  }
  return vars;
}

/** Resolve one variable against a row. Returns undefined if unresolvable. */
export function resolveVariable(
  varName: string,
  row: Record<string, string>,
  headers: string[],
  mapping: ColumnMapping
): string | undefined {
  const key = varName.trim().toLowerCase();

  // 1. Exact column match (case-insensitive)
  const exact = headers.find((h) => h.trim().toLowerCase() === key);
  if (exact) return String(row[exact] ?? "");

  // 2. Aliases -> mapped columns
  const aliasToField: Record<string, "name" | "email" | "domain" | "role"> = {
    name: "name",
    "student name": "name",
    email: "email",
    domain: "domain",
    role: "role",
  };
  const field = aliasToField[key];
  if (field) {
    const col = mapping[field];
    if (col) return String(row[col] ?? "");
    return undefined;
  }
  return undefined;
}

export function renderTemplate(
  template: string,
  row: Record<string, string>,
  headers: string[],
  mapping: ColumnMapping
): string {
  return template.replace(/\[([^\[\]\n\r]{1,60})\]/g, (match, inner: string) => {
    const resolved = resolveVariable(inner, row, headers, mapping);
    return resolved === undefined ? match : resolved;
  });
}

/** Variables in template that cannot be resolved to any column. */
export function findMissingVariables(
  template: string,
  headers: string[],
  mapping: ColumnMapping
): string[] {
  const lowerHeaders = new Set(headers.map((h) => h.trim().toLowerCase()));
  return extractVariables(template).filter((v) => {
    const key = v.trim().toLowerCase();
    if (lowerHeaders.has(key)) return false;
    if ((key === "name" || key === "student name") && mapping.name) return false;
    if (key === "email" && mapping.email) return false;
    if (key === "domain" && mapping.domain) return false;
    if (key === "role" && mapping.role) return false;
    return true;
  });
}
