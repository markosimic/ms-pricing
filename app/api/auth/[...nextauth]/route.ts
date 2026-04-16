import { handlers } from '@/app/lib/auth'

// Expose NextAuth GET/POST handlers at /api/auth/*
// This covers: /api/auth/signin, /api/auth/signout, /api/auth/callback/microsoft-entra-id, etc.
export const { GET, POST } = handlers
