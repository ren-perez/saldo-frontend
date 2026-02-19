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

const ALLOWED_IMAGE_HOSTNAMES = [
  "ded6e7106cd055bb832c5438d6d36d31.r2.cloudflarestorage.com",
  "pub-fce27a4089b44a73b8fc267aefeebde6.r2.dev",
  "pub-b264c67b59ea4ec887df2620b88af9b4.r2.dev",
]

function isAllowedImageHost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return ALLOWED_IMAGE_HOSTNAMES.includes(hostname)
  } catch {
    return false
  }
}

export const EnhancedImage: React.FC<EnhancedImageProps> = ({
  src,
  alt,
  width = 300,
  height = 200,
  className = ""
}) => {
  const [imageError, setImageError] = useState(false)

  if (!src || imageError || !isAllowedImageHost(src)) {
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
