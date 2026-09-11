# Ecell Automation

Personalized bulk email automation for E-Cell.

**Workflow:** Upload Excel → Map columns → Write any email → Attach files (optional) → Preview → Send test → Confirm → Send all → Results → Download report.

Sending is subject to Gmail account limits and Google API quotas.

## Features

- Excel upload (`.xlsx`, `.xls`), parsed in the browser with SheetJS — files are never stored
- Intelligent column detection (name / email / domain / role / attachment) with manual mapping
- Row validation: bad emails, missing fields, duplicates, empty rows (invalid rows are skipped, never sent)
- Free-form composer with `[Variable]` personalization for every Excel column
- Missing-variable warnings instead of silent blanks
- 3 attachment modes: none, same files for everyone, individual file per student (certificates)
- Exact-after-normalization certificate matching + manual correction (no risky fuzzy matches)
- Live preview for any recipient + 5-row readiness table
- Real test email, confirmation modal, sequential bulk sending with live progress
- Per-recipient Sent / Failed / Skipped results + CSV report export
- Google OAuth 2.0 + Gmail API (no passwords, tokens stay server-side in encrypted JWTs)

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · next-auth · googleapis · xlsx · sanitize-html · lucide-react

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in values (see below)
npm run dev                  # http://localhost:3000
```

Build / start:

```bash
npm run build
npm run start
```

Try it with the bundled test data (all fake `@example.com` addresses, includes intentionally
invalid rows): `public/samples/students-sample.xlsx` and `public/samples/certificates-sample.xlsx`.

## Google Cloud setup (Gmail API + OAuth)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. `ecell-mailer`).
2. **APIs & Services → Library**: enable the **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (or Internal for a Google Workspace org).
   - Fill app name (`E-Cell Mailer`), support email, developer contact.
   - Add scope: `https://www.googleapis.com/auth/gmail.send`.
   - Add yourself as a **test user** (required while the app is in Testing mode).
   - Note: requesting `gmail.send` for general/public use may require Google OAuth verification.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs — add:
     - `http://localhost:3000/api/auth/callback/google` (local)
     - `https://<your-app>.vercel.app/api/auth/callback/google` (production)
5. Copy the **Client ID** and **Client secret** into env vars:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
NEXTAUTH_SECRET=<random 32+ char string>   # e.g. openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

6. Run locally, click **Connect Gmail**, sign in with the E-Cell Gmail account, and send a test email to yourself.

## Deploy to Vercel

```bash
npm i -g vercel   # or use the Vercel dashboard → Add New Project
vercel
```

Then in **Vercel → Project → Settings → Environment Variables**, add:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (must equal `https://<your-app>.vercel.app/api/auth/callback/google`)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://<your-app>.vercel.app`

Also add `https://<your-app>.vercel.app/api/auth/callback/google` as an authorized redirect URI
in the Google Cloud OAuth client, redeploy, and test Gmail auth + sending in production.

## Project structure

```
app/
  page.tsx                    # dashboard + campaign orchestration
  layout.tsx / providers.tsx  # SessionProvider
  auth-error/                 # friendly OAuth error page (cancelled/denied logins)
  api/
    auth/[...nextauth]/route.ts
    gmail/status|send|test/route.ts
components/
  GmailHeader.tsx  ExcelUploader.tsx  ColumnMapper.tsx  CampaignComposer.tsx
  AttachmentManager.tsx  EmailPreview.tsx  TestEmail.tsx  SendWidgets.tsx  ui.tsx
lib/
  columns.ts  excel.ts  personalization.ts  matching.ts  env.ts
  email-format.ts  mime.ts  gmail.ts  send-email.ts  auth.ts  campaign.ts
public/samples/               # fake test datasets
scripts/make-sample.mjs       # regenerates sample Excel files
scripts/acceptance.ts         # lightweight logic tests (run with tsx)
```

## Privacy & security notes

- Excel files and attachments live only in browser memory; attachments are base64-encoded per send request and never stored.
- Gmail OAuth tokens are kept in server-side encrypted JWTs and never exposed to the frontend.
- Email HTML is sanitized server-side (`sanitize-html` allowlist); subjects are RFC-2047 encoded for Unicode/emoji.
- Bulk sends run sequentially with pacing; quota errors stop the campaign safely instead of retry-looping.
- Sign-in always uses `prompt=select_account` so the Google account chooser appears every time.
- Access tokens expire after ~1 hour; the send API attempts one silent refresh when a refresh token
  is available, otherwise it asks the user to disconnect and reconnect Gmail. (Google only issues a
  refresh token on first-time consent, so keep the original authorization if prompted.)
