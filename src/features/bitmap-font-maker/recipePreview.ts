import type { BitmapFontRecipe } from './contracts'

export interface FabricRecipePreviewProps {
  fontWeight: number
  skewX: number
  stroke?: string
  strokeWidth: number
  strokeLineJoin: 'round'
  fill: string
}

export interface SavedTextStyle {
  fill: unknown
  fontWeight: unknown
  skewX: unknown
  stroke: unknown
  strokeWidth: unknown
  strokeLineJoin: unknown
}

const recipeKeys = ['schemaVersion', 'rendererVersion', 'fontWeight', 'italicAngle', 'outlineWidthEm', 'outlineMode', 'lineJoin', 'antialias'] as const

const recipeKeySet = new Set<string>(recipeKeys)
const previewBaseline = Symbol('bitmapRecipePreviewBaseline')

const isPlainRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const hasDuplicateTopLevelKey = (json: string): boolean => {
  const seen = new Set<string>()
  let depth = 0
  let inString = false
  let escaped = false
  let keyStart = -1

  for (let index = 0; index < json.length; index += 1) {
    const char = json[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') {
        inString = false
        if (depth === 1 && keyStart >= 0) {
          let cursor = index + 1
          while (/\s/.test(json[cursor] || '')) cursor += 1
          if (json[cursor] === ':') {
            const rawKey = json.slice(keyStart, index)
            let key: string
            try {
              key = JSON.parse(`"${rawKey}"`)
            } catch {
              return true
            }
            if (seen.has(key)) return true
            seen.add(key)
          }
        }
        keyStart = -1
      }
      continue
    }
    if (char === '"') {
      inString = true
      keyStart = index + 1
    } else if (char === '{' || char === '[') depth += 1
    else if (char === '}' || char === ']') depth -= 1
  }
  return false
}

export function parseBitmapFontRecipe(value: unknown): BitmapFontRecipe | null {
  let candidate = value
  if (typeof value === 'string') {
    if (hasDuplicateTopLevelKey(value)) return null
    try {
      candidate = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!isPlainRecord(candidate)) return null
  const keys = Object.keys(candidate)
  if (keys.length !== recipeKeys.length || keys.some((key) => !recipeKeySet.has(key))) return null
  if (
    candidate.schemaVersion !== 1 ||
    candidate.rendererVersion !== '1' ||
    typeof candidate.fontWeight !== 'number' ||
    !Number.isFinite(candidate.fontWeight) ||
    typeof candidate.italicAngle !== 'number' ||
    !Number.isFinite(candidate.italicAngle) ||
    typeof candidate.outlineWidthEm !== 'number' ||
    !Number.isFinite(candidate.outlineWidthEm) ||
    !['fill', 'fill-outline', 'outline-only'].includes(String(candidate.outlineMode)) ||
    candidate.lineJoin !== 'round' ||
    candidate.antialias !== true
  )
    return null
  if (candidate.fontWeight < 100 || candidate.fontWeight > 900 || candidate.italicAngle < -20 || candidate.italicAngle > 20 || candidate.outlineWidthEm < 0 || candidate.outlineWidthEm > 0.5)
    return null
  return candidate as unknown as BitmapFontRecipe
}

const safeFontSize = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(4096, Math.max(1, parsed)) : 1
}

export function recipeToFabricProps(value: unknown, fontSize: unknown, elementColor: unknown): FabricRecipePreviewProps | undefined {
  const recipe = parseBitmapFontRecipe(value)
  if (!recipe) return undefined
  const color = typeof elementColor === 'string' && elementColor ? elementColor : '#FFFFFF'
  const hasOutline = recipe.outlineMode !== 'fill' && recipe.outlineWidthEm > 0
  return {
    fontWeight: recipe.fontWeight,
    skewX: recipe.italicAngle,
    stroke: hasOutline ? color : undefined,
    strokeWidth: hasOutline ? recipe.outlineWidthEm * safeFontSize(fontSize) : 0,
    strokeLineJoin: 'round',
    fill: recipe.outlineMode === 'outline-only' ? 'rgba(0,0,0,0)' : color
  }
}

const currentStyle = (object: any): SavedTextStyle => ({
  fill: object?.fill,
  fontWeight: object?.fontWeight,
  skewX: object?.skewX,
  stroke: object?.stroke,
  strokeWidth: object?.strokeWidth,
  strokeLineJoin: object?.strokeLineJoin
})

export function savedTextStyle(object: any): SavedTextStyle {
  return object?.[previewBaseline] ?? currentStyle(object)
}

export function applyRecipePreviewToFabricObject(object: any, value: unknown, fontSize: unknown = object?.fontSize, elementColor: unknown = object?.fill): void {
  if (!object) return
  const props = recipeToFabricProps(value, fontSize, elementColor)
  const baseline = object[previewBaseline] as SavedTextStyle | undefined
  if (!props) {
    if (baseline) {
      if (typeof elementColor === 'string' && elementColor) baseline.fill = elementColor
      object.set?.(baseline) ?? Object.assign(object, baseline)
      delete object[previewBaseline]
    }
    return
  }
  if (!baseline) {
    const captured = currentStyle(object)
    if (typeof elementColor === 'string' && elementColor) captured.fill = elementColor
    Object.defineProperty(object, previewBaseline, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: captured
    })
  } else if (typeof elementColor === 'string' && elementColor) {
    baseline.fill = elementColor
  }
  object.set?.(props) ?? Object.assign(object, props)
}
