// Server-side environment validation for Google OAuth. Never import into client components.

const REQUIRED = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET", "NEXTAUTH_URL"] as const;

export function missingOAuthEnv(): string[] {
  return REQUIRED.filter((k) => !process.env[k]);
}

export function isOAuthConfigured(): boolean {
  return missingOAuthEnv().length === 0;
}

/**
 * The redirect URI that must be registered in the Google Cloud OAuth client.
 * NextAuth derives the actual redirect URI from NEXTAUTH_URL; GOOGLE_REDIRECT_URI
 * (if set) is validated against it to catch misconfiguration early.
 */
export function expectedRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/auth/callback/google`;
}
