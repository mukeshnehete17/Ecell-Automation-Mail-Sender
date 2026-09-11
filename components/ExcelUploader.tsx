"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2, X } from "lucide-react";
import { Button, StepTitle, Badge } from "./ui";
import { autoDetectColumns, type ColumnMapping } from "@/lib/columns";
import type { RowData } from "@/lib/excel";

interface Props {
  fileName: string | null;
  headers: string[];
  rowCount: number;
  onLoaded: (data: { fileName: string; headers: string[]; rows: RowData[]; mapping: ColumnMapping }) => void;
  onClear: () => void;
}

export default function ExcelUploader({ fileName, headers, rowCount, onLoaded, onClear }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setError("Only .xlsx and .xls files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("That Excel file is larger than 10 MB. Please use a smaller file.");
      return;
    }
    setReading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheet = wb.SheetNames[0];
      if (!firstSheet) {
        setError("The spreadsheet has no sheets.");
        return;
      }
      const ws = wb.Sheets[firstSheet];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
      if (json.length === 0) {
        setError("The spreadsheet is empty. Please upload a file with a header row and at least one student.");
        return;
      }
      const detectedHeaders = Object.keys(json[0]);
      if (detectedHeaders.length === 0) {
        setError("Could not detect column headers. Make sure the first row contains headers like Name and Email.");
        return;
      }
      const rows: RowData[] = json.map((r) => {
        const out: RowData = {};
        for (const h of detectedHeaders) out[h] = String(r[h] ?? "").trim();
        return out;
      });
      onLoaded({ fileName: file.name, headers: detectedHeaders, rows, mapping: autoDetectColumns(detectedHeaders) });
    } catch {
      setError("We couldn't read that Excel file. Please check the file and try again.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <StepTitle step="Step 1" title="Upload Student List" description="Upload an Excel file containing recipient information. The file is processed in your browser and never stored." />
      {fileName ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <FileSpreadsheet className="h-5 w-5 text-emerald-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900">{fileName}</p>
            <p className="text-xs text-neutral-600">
              Students detected: {rowCount} · Columns: {headers.join(", ")}
            </p>
          </div>
          <Badge tone="green">{rowCount} rows</Badge>
          <Button variant="secondary" onClick={onClear}>
            <X className="h-4 w-4" aria-hidden /> Remove
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop Excel file here or press Enter to choose a file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 bg-neutral-50/50 hover:border-neutral-400"
          }`}
        >
          {reading ? (
            <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
          ) : (
            <Upload className="h-8 w-8 text-neutral-400" aria-hidden />
          )}
          <p className="mt-3 text-sm font-medium text-neutral-900">
            {reading ? "Reading Excel…" : "Drop Excel file here"}
          </p>
          <p className="mt-1 text-xs text-neutral-500">or</p>
          <span className="mt-2">
            <Button variant="secondary" disabled={reading} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              Choose Excel File
            </Button>
          </span>
          <p className="mt-3 text-xs text-neutral-500">Accepted: .xlsx, .xls</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            aria-label="Choose Excel file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
      {!fileName && !error && (
        <p className="mt-3 text-sm text-neutral-500">Upload your student list to get started.</p>
      )}
    </div>
  );
}
