import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: `openid email profile ${GMAIL_SEND_SCOPE}`,
          access_type: "offline",
          // Always show the Google account chooser so the user — not the
          // browser's active session — decides which account authorizes sending.
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    // Friendly error page (handles cancelled/denied logins gracefully).
    error: "/auth-error",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist OAuth tokens server-side only (in encrypted JWT). Never sent to client directly.
      // NOTE: with prompt=select_account, Google omits refresh_token on re-authorizations,
      // so preserve previously stored tokens instead of overwriting them with undefined.
      if (account) {
        if (account.access_token) token.accessToken = account.access_token;
        if (account.refresh_token) token.refreshToken = account.refresh_token;
        if (account.expires_at) token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session }) {
      // Deliberately do NOT expose access/refresh tokens to the client.
      return session;
    },
  },
};
