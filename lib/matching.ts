// File matching for individual attachments. Client-safe.

export function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/** Normalize a filename/cell value into comparable keys (multiple variants). */
export function normalizeKeys(raw: string): string[] {
  const t = raw.trim();
  const noExt = stripExtension(t);
  const variants = [t, noExt];
  return variants.map((v) =>
    v
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Match Excel attachment values to uploaded files.
 * Only exact-after-normalization matches count as automatic.
 * Returns map: rowIndex -> File, plus unmatched row indexes.
 * Never fuzzy-matches: normalized keys must be equal.
 */
export function matchFilesToRows<T extends { name: string }>(
  cellValues: (string | undefined)[],
  files: T[]
): { matched: Map<number, T>; unmatched: number[]; keyToFile: Map<string, T[]> } {
  // Build lookup: normalized key -> files
  const keyToFile = new Map<string, T[]>();
  files.forEach((f) => {
    for (const k of normalizeKeys(f.name)) {
      const arr = keyToFile.get(k) ?? [];
      arr.push(f);
      keyToFile.set(k, arr);
    }
  });

  const matched = new Map<number, T>();
  const unmatched: number[] = [];

  cellValues.forEach((cell, i) => {
    const v = (cell ?? "").trim();
    if (!v) {
      unmatched.push(i);
      return;
    }
    const keys = normalizeKeys(v);
    let found: T | undefined;
    let ambiguous = false;
    for (const k of keys) {
      const candidates = keyToFile.get(k);
      if (candidates && candidates.length > 0) {
        // If multiple distinct files share the key, require manual confirmation.
        const distinct = [...new Set(candidates.map((c) => c.name))];
        if (distinct.length > 1) {
          ambiguous = true;
          break;
        }
        found = candidates[0];
        break;
      }
    }
    if (found && !ambiguous) matched.set(i, found);
    else unmatched.push(i);
  });

  return { matched, unmatched, keyToFile };
}

export const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB per email (Gmail limit 25MB)

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "txt",
  "pptx",
  "ppt",
  "zip",
]);

export function isAllowedAttachment(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
