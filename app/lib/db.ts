import { PrismaClient } from '@prisma/client'

// Prevent multiple Prisma instances in development hot-reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ── Serialisation helpers ──────────────────────────────────────────────────
// SQL Server has no native array or JSONB types. We store JSON as NVarChar(Max)
// and convert at the boundary so the rest of the app stays type-clean.

/** Serialise a value to a JSON string for NVarChar storage. */
export function toJson(value: unknown): string {
  return JSON.stringify(value)
}

/** Parse a JSON NVarChar column; returns fallback on null / parse failure. */
export function fromJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Convert a Prisma Decimal (decimal.js) to a plain JS number. */
export function dec(value: { toNumber(): number } | null | undefined): number {
  return value?.toNumber() ?? 0
}
