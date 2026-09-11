// Generates privacy-safe sample Excel files under public/samples/.
// Run: node scripts/make-sample.mjs
import * as XLSX from "xlsx";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "samples");
mkdirSync(root, { recursive: true });

// Scenario A — personalized welcome (all fake @example.com addresses)
const welcome = [
  { "Student Name": "Rahul Patil", Email: "rahul.test@example.com", Domain: "Technical", Role: "Member", College: "ABC College" },
  { "Student Name": "Priya Sharma", Email: "priya.test@example.com", Domain: "PR", Role: "Member", College: "ABC College" },
  { "Student Name": "Aman Jain", Email: "aman.test@example.com", Domain: "Design", Role: "Lead", College: "ABC College" },
  { "Student Name": "Sneha Rao", Email: "sneha.test@example.com", Domain: "Marketing", Role: "Member", College: "XYZ College" },
  { "Student Name": "Bad Row", Email: "not-an-email", Domain: "PR", Role: "Member", College: "ABC College" },
  { "Student Name": "Missing Email", Email: "", Domain: "Technical", Role: "Member", College: "ABC College" },
];

// Scenario C — individual certificates
const certs = [
  { "Student Name": "Rahul Patil", Email: "rahul.test@example.com", Certificate: "Rahul_Patil.pdf" },
  { "Student Name": "Priya Sharma", Email: "priya.test@example.com", Certificate: "Priya_Sharma.pdf" },
  { "Student Name": "Aman Jain", Email: "aman.test@example.com", Certificate: "Aman_Jain.pdf" },
];

for (const [name, rows] of [["students-sample.xlsx", welcome], ["certificates-sample.xlsx", certs]]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, join(root, name));
  console.log(`wrote public/samples/${name} (${rows.length} rows)`);
}
