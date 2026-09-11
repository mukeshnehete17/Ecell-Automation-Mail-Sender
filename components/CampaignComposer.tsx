"use client";

import { StepTitle, Field, inputClass } from "./ui";
import { extractVariables } from "@/lib/personalization";

interface Props {
  subject: string;
  body: string;
  headers: string[];
  onSubject: (v: string) => void;
  onBody: (v: string) => void;
}

export default function CampaignComposer({ subject, body, headers, onSubject, onBody }: Props) {
  const variables = headers.length > 0 ? headers : [];
  const usedVars = extractVariables(`${subject}\n${body}`);

  function insertVariable(v: string, target: "subject" | "body") {
    const token = `[${v}]`;
    if (target === "subject") onSubject(subject ? `${subject} ${token}` : token);
    else onBody(body ? `${body}${body.endsWith("\n") ? "" : " "}${token}` : token);
  }

  return (
    <div>
      <StepTitle step="Step 3" title="Write Your Email" description="Write any message. Click a variable to insert it — only variables change, everything else is sent exactly as written." />
      <div className="space-y-4">
        <Field label="Subject" htmlFor="subject">
          <input
            id="subject"
            className={inputClass}
            placeholder="Congratulations on Your Selection — E-Cell 🎉"
            value={subject}
            onChange={(e) => onSubject(e.target.value)}
          />
        </Field>
        <Field label="Message" htmlFor="body">
          <textarea
            id="body"
            rows={10}
            className={`${inputClass} font-normal leading-relaxed`}
            placeholder={"Dear [Student Name],\n\nCongratulations! 🎉\n\nYou have been selected for the [Domain] team.\n\nBest Regards,\nE-Cell Team"}
            value={body}
            onChange={(e) => onBody(e.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Formatting: blank lines make paragraphs · lines starting with - make bullets · **bold** · *italic* · [text](https://link)
          </p>
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-700">Available Variables</p>
          {variables.length === 0 ? (
            <p className="text-sm text-neutral-500">Upload an Excel file to see variables from your columns.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v, "body")}
                  title={`Insert [${v}] into message`}
                  className="rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 font-mono text-xs text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
                >
                  [{v}]
                </button>
              ))}
            </div>
          )}
          {usedVars.length > 0 && (
            <p className="mt-2 text-xs text-neutral-500">
              Used in this email: {usedVars.map((v) => `[${v}]`).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
