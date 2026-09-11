// Excel row types + validation. Client-safe.

import type { ColumnMapping } from "./columns";
import { extractVariables } from "./personalization";

export type RowData = Record<string, string>;

export interface InvalidRow {
  rowNumber: number; // 1-indexed Excel row (header = 1)
  name: string;
  email: string;
  problem: string;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: InvalidRow[];
  duplicateEmails: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Validate rows against mapping + template variables + attachment mode.
 * Returns per-row status used by preview/send tables.
 */
export function validateRows(
  rows: RowData[],
  headers: string[],
  mapping: ColumnMapping,
  options: {
    subject: string;
    body: string;
    attachmentMode: "none" | "same" | "individual";
    // For individual mode: set of row indexes (0-based) that have a matched file.
    individualMatched?: Set<number>;
  }
): { summary: ValidationSummary; rowStatus: ("valid" | "invalid")[]; rowProblems: (string | null)[] } {
  const { subject, body, attachmentMode, individualMatched } = options;
  const templateVars = extractVariables(`${subject}\n${body}`);
  const lowerHeaders = new Map(headers.map((h) => [h.trim().toLowerCase(), h]));

  // Which mapped fields are actually required by the template?
  const needsField = (field: "name" | "email" | "domain" | "role"): boolean => {
    const col = mapping[field];
    if (!col) {
      // Check aliases: [name]/[student name] -> name field, etc.
      const aliases: Record<string, string[]> = {
        name: ["name", "student name"],
        email: ["email"],
        domain: ["domain"],
        role: ["role"],
      };
      return templateVars.some((v) => aliases[field].includes(v.trim().toLowerCase()));
    }
    return templateVars.some((v) => v.trim().toLowerCase() === col.trim().toLowerCase());
  };

  const needName = needsField("name");
  const needDomain = needsField("domain");
  const needRole = needsField("role");

  const seen = new Map<string, number>(); // email -> first index
  const counts = new Map<string, number>(); // email -> occurrences (linear duplicate detection)
  const rowStatus: ("valid" | "invalid")[] = [];
  const rowProblems: (string | null)[] = [];
  const invalid: InvalidRow[] = [];

  const emailCol = mapping.email;
  const nameCol = mapping.name;
  const domainCol = mapping.domain;
  const roleCol = mapping.role;
  const attachCol = mapping.attachment;

  rows.forEach((row, i) => {
    const excelRow = i + 2;
    const problems: string[] = [];
    const rawEmail = emailCol ? (row[emailCol] ?? "") : "";
    const email = String(rawEmail).trim();
    const name = nameCol ? String(row[nameCol] ?? "").trim() : "";

    // Empty row (all cells blank) -> skipped as invalid/empty
    const allBlank = headers.every((h) => String(row[h] ?? "").trim() === "");
    if (allBlank) {
      problems.push("Empty row");
    } else {
      if (!emailCol) {
        problems.push("Email column not mapped");
      } else if (!email) {
        problems.push("Missing email");
      } else if (!isValidEmail(email)) {
        problems.push("Invalid email");
      } else {
        const key = email.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (seen.has(key)) {
          problems.push(`Duplicate email (first seen at row ${seen.get(key)! + 2})`);
        } else {
          seen.set(key, i);
        }
      }
      if (needName && !name) problems.push("Missing name required by template");
      if (needDomain && domainCol && !String(row[domainCol] ?? "").trim())
        problems.push("Missing domain required by template");
      if (needRole && roleCol && !String(row[roleCol] ?? "").trim())
        problems.push("Missing role required by template");
      if (needDomain && !domainCol) problems.push("Template uses [Domain] but no Domain column mapped");
      if (needRole && !roleCol) problems.push("Template uses [Role] but no Role column mapped");
      if (attachmentMode === "individual") {
        if (!attachCol) {
          problems.push("Attachment column not mapped");
        } else if (!individualMatched?.has(i)) {
          const v = String(row[attachCol] ?? "").trim();
          problems.push(v ? `No file matched for "${v}"` : "Missing attachment value");
        }
      }
      // Template references a variable with no matching column at all
      for (const v of templateVars) {
        const key = v.trim().toLowerCase();
        if (key === "name" || key === "student name") continue; // alias handled via needName
        if (!lowerHeaders.has(key) && !["email", "domain", "role"].includes(key)) {
          // Only flag once per row set — handled at template level too; add row problem
          problems.push(`Unknown variable [${v}] — no matching Excel column`);
          break;
        }
      }
    }

    if (problems.length > 0) {
      rowStatus.push("invalid");
      rowProblems.push(problems.join("; "));
      invalid.push({ rowNumber: excelRow, name: name || "(unknown)", email, problem: problems.join("; ") });
    } else {
      rowStatus.push("valid");
      rowProblems.push(null);
    }
  });

  const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([email]) => email);

  return {
    summary: { total: rows.length, valid: rows.length - invalid.length, invalid, duplicateEmails: duplicates },
    rowStatus,
    rowProblems,
  };
}
