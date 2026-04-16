import NextAuth from 'next-auth'
import { authConfig } from '@/app/lib/auth.config'

// Use only the edge-safe config here — no Prisma, no bcrypt.
// The full auth (with DB lookup) lives in app/lib/auth.ts and is used
// only by server components, server actions, and API route handlers.
const { auth } = NextAuth(authConfig)
export default auth

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth|login).*)',
  ],
}
