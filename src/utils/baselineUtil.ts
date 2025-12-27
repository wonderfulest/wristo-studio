import type { FabricElement } from '@/types/element'

let _baselineCanvas: HTMLCanvasElement | null = null
let _baselineCtx: CanvasRenderingContext2D | null = null

function measureAscentDescent(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight = 'normal',
  fontStyle = 'normal',
): { ascent: number; descent: number; height: number } {
  if (typeof document === 'undefined') {
    const approx = fontSize * 0.8
    return { ascent: approx, descent: fontSize - approx, height: fontSize }
  }

  if (!_baselineCanvas) {
    _baselineCanvas = document.createElement('canvas')
    _baselineCanvas.width = 200
    _baselineCanvas.height = 100
    _baselineCtx = _baselineCanvas.getContext('2d')
  }

  const ctx = _baselineCtx
  if (!ctx) {
    const approx = fontSize * 0.8
    return { ascent: approx, descent: fontSize - approx, height: fontSize }
  }

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  const ascent = (metrics as any).actualBoundingBoxAscent
  const descent = (metrics as any).actualBoundingBoxDescent

  if (
    typeof ascent === 'number' &&
    typeof descent === 'number' &&
    !Number.isNaN(ascent) &&
    !Number.isNaN(descent) &&
    ascent >= 0 &&
    descent >= 0
  ) {
    return { ascent, descent, height: ascent + descent }
  }

  const approx = fontSize * 0.8
  return { ascent: approx, descent: fontSize - approx, height: fontSize }
}

export function encodeTopBaseForElement(
  element: FabricElement,
  defaultFontFamily = 'roboto-condensed-regular',
): number {
  const fontSize = (element.fontSize || 14) as number
  const fontFamily = (element.fontFamily || defaultFontFamily) as string
  const { height, descent } = measureAscentDescent('Hg', fontFamily, fontSize)
  const top = (element.top ?? 0) as number
  // topBase = top + height / 2 - descent
  return top + height / 2 - descent
}
