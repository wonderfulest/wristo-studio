export type CanvasPixelPoint = { x: number; y: number }

type CanvasSize = { width: number; height: number }
type CanvasRect = { left: number; top: number; width: number; height: number }

export const getCanvasPixelPoint = (
  canvas: CanvasSize,
  rect: CanvasRect,
  clientX: number,
  clientY: number,
): CanvasPixelPoint => {
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1
  const x = Math.floor((clientX - rect.left) * scaleX)
  const y = Math.floor((clientY - rect.top) * scaleY)

  return {
    x: Math.max(0, Math.min(canvas.width - 1, x)),
    y: Math.max(0, Math.min(canvas.height - 1, y)),
  }
}

const toHexByte = (value: number): string =>
  Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()

export const pixelToVisibleColor = (pixel: Uint8ClampedArray): string => {
  const [red = 0, green = 0, blue = 0, alphaByte = 0] = pixel
  if (alphaByte === 0) return 'transparent'

  const alpha = alphaByte / 255
  return `#${toHexByte(red * alpha)}${toHexByte(green * alpha)}${toHexByte(blue * alpha)}`
}

export const sampleCanvasColor = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { color: string; point: CanvasPixelPoint } | null => {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || canvas.width <= 0 || canvas.height <= 0) return null

  const point = getCanvasPixelPoint(canvas, canvas.getBoundingClientRect(), clientX, clientY)
  const pixel = context.getImageData(point.x, point.y, 1, 1).data
  return { color: pixelToVisibleColor(pixel), point }
}
