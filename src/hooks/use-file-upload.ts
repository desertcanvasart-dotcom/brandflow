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

      // The PUT goes browser → storage directly, so a blocked origin surfaces as
      // a TypeError with no response at all. Name it rather than letting the
      // caller report a bare "Failed to fetch".
      let putRes: Response
      try {
        putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
      } catch {
        throw new Error(
          'Could not reach file storage. This is usually a CORS setting on the storage bucket — the app origin has to be an allowed origin.'
        )
      }

      // Without this check a rejected upload still resolves, and the caller
      // saves a URL for an object that was never written.
      if (!putRes.ok) {
        throw new Error(`Upload rejected by storage (${putRes.status})`)
      }

      setProgress(100)
      return publicUrl as string
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, progress }
}
