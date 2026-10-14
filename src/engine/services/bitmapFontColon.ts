/** Derive two dots from the digit's ink, preserving its height and color. */
export async function createBitmapFontColon(sourceUrl: string): Promise<Blob> {
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error('Unable to read bitmap digit for colon')
  const bitmap = await createImageBitmap(await response.blob())
  try {
    const source = document.createElement('canvas')
    source.width = bitmap.width
    source.height = bitmap.height
    const context = source.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, source.width, source.height).data
    let left = source.width,
      top = source.height,
      right = -1,
      bottom = -1
    let inkX = 0,
      inkY = 0,
      alpha = 0
    for (let y = 0; y < source.height; y++)
      for (let x = 0; x < source.width; x++) {
        const a = pixels[(y * source.width + x) * 4 + 3]
        if (a > 32) {
          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
        if (a > alpha) {
          alpha = a
          inkX = x
          inkY = y
        }
      }
    if (right < left) throw new Error('Cannot create colon from an empty bitmap digit')
    const size = Math.max(2, Math.round((bottom - top + 1) * 0.13))
    const canvas = document.createElement('canvas')
    canvas.width = size + 4
    canvas.height = source.height
    const output = canvas.getContext('2d')!
    const offset = (inkY * source.width + inkX) * 4
    output.fillStyle = `rgba(${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]},${alpha / 255})`
    for (const fraction of [0.32, 0.68]) {
      output.beginPath()
      output.arc(canvas.width / 2, top + (bottom - top) * fraction, size / 2, 0, Math.PI * 2)
      output.fill()
    }
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to encode colon'))), 'image/png'))
  } finally {
    bitmap.close()
  }
}
