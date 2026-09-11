// Column detection candidates + auto-mapping. Client-safe (no Node deps).

export type MappedField = "name" | "email" | "domain" | "role" | "attachment";

export type ColumnMapping = Record<MappedField, string | null>;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export const COLUMN_CANDIDATES: Record<MappedField, string[]> = {
  name: ["name", "student name", "full name", "candidate name", "student", "full student name"],
  email: ["email", "email id", "email address", "e-mail", "mail", "gmail", "e mail"],
  domain: ["domain", "team", "department", "selected domain"],
  role: ["role", "position", "designation"],
  attachment: [
    "attachment",
    "file",
    "certificate",
    "certificate file",
    "document",
    "pdf",
    "file name",
    "attachment name",
  ],
};

export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { name: null, email: null, domain: null, role: null, attachment: null };
  const used = new Set<string>();
  (Object.keys(COLUMN_CANDIDATES) as MappedField[]).forEach((field) => {
    const candidates = COLUMN_CANDIDATES[field];
    for (const header of headers) {
      if (used.has(header)) continue;
      if (candidates.includes(norm(header))) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  });
  return mapping;
}
