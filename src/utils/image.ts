const MAX_WIDTH: number = 800
const MAX_HEIGHT: number = 800
const QUALITY: number = 0.7

export function compressImage(file: File): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const reader: FileReader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img: HTMLImageElement = new Image()
      img.onload = () => {
        const canvas: HTMLCanvasElement = document.createElement('canvas')
        let { width, height } = img

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio: number = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
        ctx!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob: Blob | null) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
          'image/jpeg',
          QUALITY,
        )
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
