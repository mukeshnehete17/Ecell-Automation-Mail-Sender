// Acceptance-test for core campaign logic (Scenario A + C). Run: npx --yes tsx scripts/acceptance.ts
import { autoDetectColumns } from "../lib/columns";
import { validateRows } from "../lib/excel";
import { renderTemplate, extractVariables, findMissingVariables } from "../lib/personalization";
import { matchFilesToRows } from "../lib/matching";
import { textToHtml } from "../lib/email-format";
import { buildRawMessage, encodeHeaderParam } from "../lib/mime";
import { resultsToCsv } from "../lib/campaign";
import { missingOAuthEnv, expectedRedirectUri } from "../lib/env";

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

// --- duplicate summary is linear and correct ---
const dupRows = [
  { "Student Name": "A", Email: "a@example.com", Domain: "X" },
  { "Student Name": "B", Email: "A@example.com", Domain: "X" },
  { "Student Name": "C", Email: "c@example.com", Domain: "X" },
];
const vd = validateRows(dupRows, headers, { ...mapping }, { subject, body, attachmentMode: "none" });
check("duplicate summary lists a@example.com", vd.summary.duplicateEmails.join() === "a@example.com");
check("second dupe invalid", vd.rowStatus[1] === "invalid");

// --- dynamic custom column placeholder ---
const customHeaders = ["Name", "Email", "College"];
const customMapping = autoDetectColumns(customHeaders);
const customRow = { Name: "Rahul", Email: "r@example.com", College: "ABC College" };
check(
  "custom [College] resolves",
  renderTemplate("Hello [Name], welcome from [College]!", customRow, customHeaders, customMapping) ===
    "Hello Rahul, welcome from ABC College!"
);

// --- MIME: unicode filenames + structure ---
const rawB64Url = buildRawMessage({
  to: "test@example.com",
  subject: "नमस्ते Rahul 🎉",
  bodyText: "Dear Rahul,\n\nWelcome!",
  attachments: [
    { filename: "Rahul_Patil.pdf", mimeType: "application/pdf", contentBase64: Buffer.from("pdf-bytes").toString("base64") },
    { filename: "प्रमाणपत्र_Rahul.pdf", mimeType: "application/pdf", contentBase64: Buffer.from("pdf-bytes").toString("base64") },
  ],
});
const rawMime = Buffer.from(rawB64Url.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
check("mime has To header", rawMime.includes("To: test@example.com"));
check("mime subject RFC2047", rawMime.includes("Subject: =?UTF-8?B?"));
check("mime ascii filename quoted", rawMime.includes('filename="Rahul_Patil.pdf"'));
check(
  "mime unicode filename encoded",
  rawMime.includes("filename=\"=?UTF-8?B?") && !rawMime.includes("प्रमाणपत्र_Rahul.pdf")
);
check("mime closes boundaries", rawMime.includes("--") && rawMime.includes("multipart/mixed"));
check("ascii param quoted", encodeHeaderParam("a b.pdf") === '"a b.pdf"');
check("header injection stripped", !encodeHeaderParam('a"\r\nBcc: x@y.z').includes("\r\n"));

// --- CSV report with timestamps ---
const csv = resultsToCsv(
  [
    { index: 0, name: "Rahul", email: "r@example.com", domain: "Tech", attachmentName: "R.pdf", status: "sent", time: "2026-01-01T00:00:00.000Z" },
    { index: 1, name: 'Priya "P"', email: "p@example.com", domain: "", attachmentName: null, status: "failed", error: "Gmail error: boom", time: "2026-01-01T00:01:00.000Z" },
  ],
  { headers, rows, mapping, fileName: "s.xlsx" }
);
const csvLines = csv.split("\r\n");
check("csv header has Time", csvLines[0] === '"Student Name","Email","Domain","Role","Attachment","Status","Time","Error"');
check("csv escapes quotes", csvLines[2].includes('"Priya ""P"""'));

// --- env helper ---
check("env helper detects missing", Array.isArray(missingOAuthEnv()));
check("redirect uri default", expectedRedirectUri().endsWith("/api/auth/callback/google"));

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
