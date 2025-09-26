// components/ui/enhanced-image.tsx
"use client"

import { useState } from "react"
import Image from "next/image"
import { Placeholder } from "@/components/placeholder"

export interface EnhancedImageProps {
  src?: string
  alt: string
  width?: number
  height?: number
  className?: string
}

export const EnhancedImage: React.FC<EnhancedImageProps> = ({
  src,
  alt,
  width = 300,
  height = 200,
  className = ""
}) => {
  const [imageError, setImageError] = useState(false)

  if (!src || imageError) {
    return (
      <Placeholder
        width={width}
        height={height}
        text={alt}
        className={`absolute inset-0 ${className}`}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-cover ${className}`}
      onError={() => setImageError(true)}
    />
  )
}
