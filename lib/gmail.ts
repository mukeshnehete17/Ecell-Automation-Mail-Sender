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
  return { gmail: google.gmail({ version: "v1", auth: oauth2 }), oauth2 };
}

/**
 * Exchange the stored refresh token for a fresh access token (single attempt).
 * Returns null when no refresh token exists or the refresh fails (e.g. revoked).
 * Never throws and never logs token values.
 */
export async function refreshAccessToken(refreshToken: string | undefined): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2.setCredentials({ refresh_token: refreshToken });
    const res = await oauth2.getAccessToken();
    return res.token ?? null;
  } catch {
    return null;
  }
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
