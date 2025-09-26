// components/ui/placeholder.tsx
import { FC } from 'react'

interface PlaceholderProps {
  width?: number
  height?: number
  text?: string
  className?: string
  backgroundColor?: string
  textColor?: string
}

export const Placeholder: FC<PlaceholderProps> = ({
  width = 300,
  height = 200,
  text,
  className = '',
  backgroundColor = '#e5e7eb',
  textColor = '#6b7280'
}) => {
  const displayText = text || `${width}×${height}`
  
  return (
    <div
      className={`flex items-center justify-center w-full h-full ${className}`}
      style={{
        backgroundColor,
        color: textColor,
        minHeight: `${height}px`
      }}
    >
      <div className="text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto mb-2 opacity-50"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <div className="text-sm font-medium opacity-75">{displayText}</div>
      </div>
    </div>
  )
}