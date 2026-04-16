// auth.ts — Full NextAuth configuration (Node.js runtime only).
// Imports Prisma + bcryptjs. NOT imported by middleware.ts.
// When you are ready to switch to Entra ID, swap the Credentials provider
// for MicrosoftEntraID here and update auth.config.ts accordingly.

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/app/lib/db'
import { authConfig } from '@/app/lib/auth.config'

// Extend the built-in Session type so server components get typed user.id
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
    }
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        const email    = (credentials?.email    as string | undefined)?.toLowerCase().trim()
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        const user = await db.users.findUnique({
          where:  { email },
          select: { id: true, email: true, name: true, password_hash: true },
        })

        if (!user?.password_hash) return null

        const valid = await bcrypt.compare(password, user.password_hash)
        if (!valid) return null

        return {
          id:    user.id,
          email: user.email,
          name:  user.name ?? '',
        }
      },
    }),
  ],
})
