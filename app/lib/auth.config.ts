// auth.config.ts — Edge-runtime-safe subset of the NextAuth configuration.
// NO Prisma, NO bcrypt, NO Node.js-only imports here.
// Used by middleware.ts to validate JWT sessions without touching the database.
// Full auth (with the Credentials provider + DB lookup) lives in auth.ts.

import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error:  '/login',
  },

  // Required for deployments behind a proxy/load balancer (e.g. Azure Container Apps)
  trustHost: true,

  session: { strategy: 'jwt' },

  // Providers list is intentionally empty here — the real Credentials provider
  // (which imports Prisma + bcryptjs) is added in auth.ts.
  providers: [],

  callbacks: {
    // Called by middleware on every protected request.
    // Returns true → proceed; false → redirect to pages.signIn.
    authorized({ auth }) {
      return !!auth
    },

    // Persist user fields from the `authorize` return value into the JWT.
    async jwt({ token, user }) {
      if (user) {
        token.id    = user.id    as string
        token.email = user.email as string
        token.name  = (user.name as string | undefined) ?? ''
      }
      return token
    },

    // Expose JWT fields as session.user so server components stay typed.
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id:    (token.id    as string)  ?? '',
          email: (token.email as string)  ?? '',
          name:  (token.name  as string)  ?? '',
        },
      }
    },
  },
}
