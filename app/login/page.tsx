'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1H10V10H1V1Z" fill="#F25022" />
      <path d="M11 1H20V10H11V1Z" fill="#7FBA00" />
      <path d="M1 11H10V20H1V11Z" fill="#00A4EF" />
      <path d="M11 11H20V20H11V11Z" fill="#FFB900" />
    </svg>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const authError = searchParams.get('error')

  async function handleMicrosoftLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid',
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-sm w-full bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-8">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-100 mb-1">MS Pricing</h1>
          <p className="text-sm text-gray-400">Sign in with your Zühlke Microsoft account</p>
          <p className="text-xs text-gray-600 mt-1">
            Only <span className="text-gray-500">@zuehlke.com</span> and{' '}
            <span className="text-gray-500">@zuhlke.com</span> addresses are accepted.
          </p>
        </div>

        {authError === 'auth_callback_failed' && (
          <div className="mb-5 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
            Sign-in failed. Try again or contact IT support.
          </div>
        )}
        {authError === 'domain_not_allowed' && (
          <div className="mb-5 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
            Access denied. Only @zuehlke.com and @zuhlke.com accounts are permitted.
          </div>
        )}

        <button
          onClick={handleMicrosoftLogin}
          className="w-full flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
        >
          <MicrosoftIcon />
          Sign in with Microsoft
        </button>

        <p className="text-center text-xs text-gray-600 mt-6">
          Access is restricted to @zuehlke.com and @zuhlke.com addresses.
        </p>
      </div>
    </div>
  )
}

// useSearchParams requires a Suspense boundary in Next.js App Router
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
