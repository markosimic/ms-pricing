'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleTemplate } from '@/app/actions/quotes'

interface Props {
  quoteId: string
  isTemplate: boolean
  templateName?: string | null
}

export default function TemplateToggleButton({ quoteId, isTemplate, templateName }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isTemplate) {
      const name = window.prompt('Template name (leave blank to use reference code):')
      if (name === null) return // cancelled
      setLoading(true)
      await toggleTemplate(quoteId, true, name.trim() || null)
    } else {
      setLoading(true)
      await toggleTemplate(quoteId, false, null)
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={isTemplate ? 'Remove template' : 'Save as template'}
      className={`text-xs transition-colors ${
        isTemplate
          ? 'text-blue-400 hover:text-blue-300'
          : 'text-gray-600 hover:text-gray-400'
      } disabled:opacity-50`}
    >
      {isTemplate ? '★' : '☆'}
    </button>
  )
}
