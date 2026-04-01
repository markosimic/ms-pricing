'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
      // Prompt for template name before saving
      const name = window.prompt('Template name (leave blank to use reference code):')
      if (name === null) return // cancelled
      setLoading(true)
      const supabase = createClient()
      await supabase
        .from('quotes')
        .update({ is_template: true, template_name: name.trim() || null })
        .eq('id', quoteId)
    } else {
      setLoading(true)
      const supabase = createClient()
      await supabase
        .from('quotes')
        .update({ is_template: false, template_name: null })
        .eq('id', quoteId)
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
