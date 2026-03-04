'use client'

import { useState } from 'react'

interface UploadOptions {
  folder?: string
  maxSizeBytes?: number
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const upload = async (file: File, options: UploadOptions = {}) => {
    const { folder = 'uploads', maxSizeBytes = 50 * 1024 * 1024 } = options

    if (file.size > maxSizeBytes) {
      throw new Error(`File size exceeds ${maxSizeBytes / 1024 / 1024}MB limit`)
    }

    setUploading(true)
    setProgress(0)

    try {
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder,
        }),
      })

      if (!res.ok) throw new Error('Failed to get upload URL')

      const { uploadUrl, publicUrl } = await res.json()

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      setProgress(100)
      return publicUrl as string
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, progress }
}
