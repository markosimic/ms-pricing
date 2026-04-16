'use client'

import { useState } from 'react'
import { sendQuoteEmail } from '@/app/actions/sendEmail'

interface Props {
  quoteId:       string
  defaultEmail?: string
}

export default function SendEmailForm({ quoteId, defaultEmail }: Props) {
  const [open,    setOpen]    = useState(false)
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [emails,  setEmails]  = useState([defaultEmail ?? '', '', ''])

  function updateEmail(i: number, val: string) {
    setEmails(prev => prev.map((e, idx) => idx === i ? val : e))
  }

  async function handleSend() {
    const addresses = emails.filter(e => e.trim() !== '')
    if (addresses.length === 0) { setError('Enter at least one email address'); return }
    setSending(true)
    setError('')
    try {
      const result = await sendQuoteEmail(quoteId, addresses)
      if (result.ok) {
        setSent(true)
        setTimeout(() => { setSent(false); setOpen(false) }, 3000)
      } else {
        setError(result.error ?? 'Send failed')
      }
    } catch {
      setError('Unexpected error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Send by email
      </button>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-full sm:w-80">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-200">Send quote by email</p>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
      </div>
      <p className="text-xs text-gray-500 mb-3">Up to 3 recipients</p>
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <input
            key={i}
            type="email"
            placeholder={i === 0 ? 'Email address *' : 'Email address (optional)'}
            value={emails[i]}
            onChange={e => updateEmail(i, e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      {sent  && <p className="text-green-400 text-xs mt-2">Sent successfully!</p>}
      <button
        onClick={handleSend}
        disabled={sending || sent}
        className="mt-3 w-full px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? 'Sending…' : sent ? 'Sent!' : 'Send'}
      </button>
    </div>
  )
}
