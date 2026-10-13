import { useState, useEffect } from 'react'
import { loadImage, blobToURL } from '../utils/imageDB'

export default function usePhotoURL(photoId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    setUrl(null)
    if (!photoId) { setUrl(null); return }
    // Legacy: base64 string stored directly
    if (photoId.startsWith('data:')) { setUrl(photoId); return }

    let objectURL: string | null = null
    let cancelled = false
    loadImage(photoId).then((blob: Blob | null) => {
      if (blob && !cancelled) {
        objectURL = blobToURL(blob)
        setUrl(objectURL)
      }
    }).catch(() => { if (!cancelled) setUrl(null) })
    return () => { cancelled = true; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [photoId])

  return url
}
