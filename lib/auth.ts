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
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // Persist OAuth tokens server-side only (in encrypted JWT). Never sent to client directly.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session }) {
      // Deliberately do NOT expose access/refresh tokens to the client.
      return session;
    },
  },
};
