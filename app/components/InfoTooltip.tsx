'use client'

import { useState } from 'react'

interface InfoTooltipProps {
  content: React.ReactNode
  width?: string
}

export default function InfoTooltip({ content, width = 'w-72' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-gray-600 hover:bg-blue-600 text-[10px] font-bold text-gray-300 hover:text-white cursor-help transition-colors ml-1.5 flex-shrink-0"
        aria-label="More information"
      >
        ?
      </button>

      {open && (
        <span
          className={`absolute z-50 bottom-full left-0 mb-2.5 ${width} bg-gray-900 border border-blue-700/50 rounded-lg shadow-2xl p-3 text-xs text-gray-300 leading-relaxed pointer-events-none`}
          style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.8))' }}
        >
          {content}
          {/* Arrow */}
          <span className="absolute top-full left-4 -translate-y-px w-0 h-0
            border-l-[5px] border-l-transparent
            border-r-[5px] border-r-transparent
            border-t-[5px] border-t-blue-700/50" />
        </span>
      )}
    </span>
  )
}
