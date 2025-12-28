import type { FabricElement } from '@/types/element'
import { Text } from 'fabric'

let _baselineCanvas: HTMLCanvasElement | null = null
let _baselineCtx: CanvasRenderingContext2D | null = null

function measureAscentDescent(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight = 'normal',
  fontStyle = 'normal',
): { ascent: number; descent: number; height: number } {
  console.log('measureAscentDescent:', { text, fontFamily, fontSize, fontWeight, fontStyle })
  
  if (typeof document === 'undefined') {
    const approx = fontSize * 0.8
    console.log('No document, using approximation:', approx)
    return { ascent: approx, descent: fontSize - approx, height: fontSize }
  }

  if (!_baselineCanvas) {
    _baselineCanvas = document.createElement('canvas')
    _baselineCanvas.width = 200
    _baselineCanvas.height = 100
    _baselineCtx = _baselineCanvas.getContext('2d')
    console.log('Created baseline canvas')
  }

  const ctx = _baselineCtx
  if (!ctx) {
    const approx = fontSize * 0.8
    console.log('No context, using approximation:', approx)
    return { ascent: approx, descent: fontSize - approx, height: fontSize }
  }

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  console.log('Set font:', ctx.font)
  
  const metrics = ctx.measureText(text)
  console.log('Metrics:', metrics)
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
    const result = { ascent, descent, height: ascent + descent }
    console.log('Valid metrics, result:', result)
    return result
  }

  const approx = fontSize * 0.8
  const fallbackResult = { ascent: approx, descent: fontSize - approx, height: fontSize }
  console.log('Invalid metrics, using fallback:', fallbackResult)
  return fallbackResult
}

// export function encodeTopBaseForElement(
//   element: FabricElement,
//   defaultFontFamily = 'roboto-condensed-regular',
// ): number {
//   console.log('encodeTopBaseForElement', element.eleType)
//   const fontSize = (element.fontSize || 14) as number
//   const fontFamily = (element.fontFamily || defaultFontFamily) as string
//   const { height, descent } = measureAscentDescent(element.text || 'Hg', fontFamily, fontSize)
//   console.log(fontFamily, fontSize, 'height', height, 'descent', descent)
//   const top = (element.top ?? 0) as number
//   // topBase = top + height / 2 - descent
//   return top + height / 2 - descent
// }


const FONT_SIZE_MULT =
  (Text as any).prototype._fontSizeMult ?? 1.13
const FONT_SIZE_FRACTION =
  (Text as any).prototype._fontSizeFraction ?? 0.222

export function encodeTopBaseForElement(
  element: FabricElement,
  _defaultFontFamily = 'roboto-condensed-regular',
): number {
  const top = (element.top ?? 0) as number
  const fontSize = (element.fontSize || 14) as number
  const scaleY = (element.scaleY ?? 1) as number

  // element.top 是 originY='center' 的中心点时：
  return top + scaleY * fontSize * FONT_SIZE_MULT * (0.5 - FONT_SIZE_FRACTION)
}
