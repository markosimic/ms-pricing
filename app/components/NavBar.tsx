'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface NavBarProps {
  userEmail: string
}

export default function NavBar({ userEmail }: NavBarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
    router.refresh()
  }

  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <span className="text-lg font-semibold text-gray-100">Managed Services Pricing Calculator</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{userEmail}</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-gray-200 underline"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
