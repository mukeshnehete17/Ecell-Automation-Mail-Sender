// Acceptance-test for core campaign logic (Scenario A + C). Run: npx --yes tsx scripts/acceptance.ts
import { autoDetectColumns } from "../lib/columns";
import { validateRows } from "../lib/excel";
import { renderTemplate, extractVariables, findMissingVariables } from "../lib/personalization";
import { matchFilesToRows } from "../lib/matching";
import { textToHtml } from "../lib/email-format";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) failures++;
}

// --- Scenario A: personalized welcome ---
const headers = ["Student Name", "Email", "Domain"];
const rows = [
  { "Student Name": "Rahul", Email: "test1@example.com", Domain: "Technical" },
  { "Student Name": "Priya", Email: "test2@example.com", Domain: "PR" },
];
const mapping = autoDetectColumns(headers);
check("auto-detect name", mapping.name === "Student Name");
check("auto-detect email", mapping.email === "Email");
check("auto-detect domain", mapping.domain === "Domain");

const subject = "Welcome";
const body =
  "Dear [Student Name],\n\nWelcome to E-Cell! 🎉\n\nYou are part of the [Domain] team.\n\nRegards,\nE-Cell Team";
const v = validateRows(rows, headers, mapping, { subject, body, attachmentMode: "none" });
check("both rows valid", v.summary.valid === 2);

const rendered = renderTemplate(body, rows[0], headers, mapping);
check("Rahul personalized", rendered.includes("Dear Rahul,") && rendered.includes("Technical team"));
check("no vars left", !rendered.includes("["));
check(
  "repeated vars all replaced",
  renderTemplate("Hi [Student Name], dear [Student Name], welcome [Student Name]!", rows[0], headers, mapping).split("Rahul").length === 4
);

// --- missing variable ---
check("missing var detected", findMissingVariables("Hello [College]", headers, mapping).join() === "College");

// --- invalid rows ---
const bad = [
  { "Student Name": "NoMail", Email: "", Domain: "X" },
  { "Student Name": "BadMail", Email: "invalid", Domain: "X" },
  { "Student Name": "Dupe", Email: "test1@example.com", Domain: "X" },
  { "Student Name": "Dupe", Email: "test1@example.com", Domain: "X" },
  { "Student Name": "", Email: "", Domain: "" },
];
const vb = validateRows(bad, headers, { ...mapping }, { subject, body, attachmentMode: "none" });
check("first dupe valid, rest invalid", vb.summary.valid === 1 && vb.rowStatus[2] === "valid" && vb.rowStatus[3] === "invalid");
check("extractVariables lists vars", extractVariables(body).join("|") === "Student Name|Domain");

// --- Scenario C: certificate matching ---
const certHeaders = ["Student Name", "Email", "Certificate"];
const certRows = [
  { "Student Name": "Rahul", Email: "test1@example.com", Certificate: "Rahul.pdf" },
  { "Student Name": "Priya", Email: "test2@example.com", Certificate: "Priya.pdf" },
];
void certRows;
const certMapping = autoDetectColumns(certHeaders);
check("auto-detect attachment", certMapping.attachment === "Certificate");
const files = [{ name: "Rahul.pdf" }, { name: "priya.PDF" }, { name: "Someone_Else.pdf" }];
const m = matchFilesToRows(["Rahul.pdf", "Priya.pdf"], files);
check("exact match Rahul", m.matched.get(0)?.name === "Rahul.pdf");
check("case-insensitive match Priya", m.matched.get(1)?.name === "priya.PDF");
check("no dangerous fuzzy match", matchFilesToRows(["Rohit.pdf"], files).unmatched.length === 1);

// --- formatting ---
const html = textToHtml("Hello\n\n- one\n- two\n\n**bold** and *italic* and [link](https://example.com)");
check(
  "html has list+bold+link",
  html.includes("<ul>") && html.includes("<strong>bold</strong>") && html.includes('href="https://example.com"')
);
check("escapes scripts", !textToHtml("<script>alert(1)</script>").includes("<script>"));

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
