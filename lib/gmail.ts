// Server-side Gmail helpers. Node only.
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "./auth";

export interface GmailContext {
  accessToken: string;
  refreshToken?: string;
  email: string;
}

export async function getGmailContext(): Promise<GmailContext | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  // Tokens live in the JWT; getServerSession doesn't include them by default,
  // so decode via getToken.
  const { getToken } = await import("next-auth/jwt");
  const { headers } = await import("next/headers");
  const h = await headers();
  const req = { headers: Object.fromEntries(h.entries()) } as unknown as Parameters<typeof getToken>[0]["req"];
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = (token?.accessToken as string | undefined) ?? undefined;
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: token?.refreshToken as string | undefined,
    email: session.user?.email ?? "",
  };
}

export function gmailClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2 });
}

export function isQuotaError(err: unknown): boolean {
  const status = (err as { code?: number })?.code;
  const message = String((err as Error)?.message ?? "").toLowerCase();
  return (
    status === 429 ||
    status === 403 ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("daily sending") ||
    message.includes("user-rate-limit")
  );
}

export function isAuthError(err: unknown): boolean {
  const status = (err as { code?: number })?.code;
  const message = String((err as Error)?.message ?? "").toLowerCase();
  return status === 401 || message.includes("invalid credentials") || message.includes("invalid grant");
}
