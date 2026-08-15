export interface BmFontChar {
  id: number
  x: number
  y: number
  width: number
  height: number
  xoffset: number
  yoffset: number
  xadvance: number
}
export interface BmFontKerning {
  first: number
  second: number
  amount: number
}
export interface BmFontTextInput {
  slug: string
  face: string
  /** Positive source pixel size; Wristo descriptors serialize it with a negative sign. */
  size: number
  lineHeight: number
  base: number
  scaleW: number
  scaleH: number
  chars: BmFontChar[]
  kernings?: BmFontKerning[]
}

const quote = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    throw new TypeError('Bitmap font slug must contain only letters, numbers, and single hyphens')
  }
}

function invalid(detail: string): never {
  throw new TypeError(`BMFONT_INVALID_INPUT: ${detail}`)
}

function safeInteger(value: number, detail: string, minimum = Number.MIN_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < minimum) invalid(detail)
}

function unicodeScalar(value: number, detail: string): void {
  safeInteger(value, detail, 0)
  if (value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) invalid(detail)
}

function validateInput(input: BmFontTextInput): void {
  if (!input.face || /[\u0000-\u001f\u007f]/.test(input.face)) invalid('face')
  safeInteger(input.lineHeight, 'lineHeight', 1)
  safeInteger(input.base, 'base', 0)
  safeInteger(input.scaleW, 'scaleW', 1)
  safeInteger(input.scaleH, 'scaleH', 1)
  if (input.lineHeight > 8192 || input.scaleW > 8192 || input.scaleH > 8192 || input.base > input.lineHeight) invalid('common metrics')

  const charIds = new Set<number>()
  for (const char of input.chars) {
    unicodeScalar(char.id, 'char id')
    if (charIds.has(char.id)) invalid('duplicate char id')
    charIds.add(char.id)
    safeInteger(char.x, 'char x', 0)
    safeInteger(char.y, 'char y', 0)
    safeInteger(char.width, 'char width', 0)
    safeInteger(char.height, 'char height', 0)
    safeInteger(char.xoffset, 'char xoffset')
    safeInteger(char.yoffset, 'char yoffset')
    safeInteger(char.xadvance, 'char xadvance', 0)
    if (Math.abs(char.xoffset) > 8192 || Math.abs(char.yoffset) > 8192 || char.xadvance > 8192) invalid('char metrics')
    if (char.x + char.width > input.scaleW || char.y + char.height > input.scaleH) invalid('char rectangle')
  }

  const pairs = new Set<string>()
  for (const kerning of input.kernings ?? []) {
    unicodeScalar(kerning.first, 'kerning first')
    unicodeScalar(kerning.second, 'kerning second')
    safeInteger(kerning.amount, 'kerning amount')
    if (Math.abs(kerning.amount) > 8192) invalid('kerning amount')
    if (!charIds.has(kerning.first) || !charIds.has(kerning.second)) invalid('dangling kerning')
    const pair = `${kerning.first}:${kerning.second}`
    if (pairs.has(pair)) invalid('duplicate kerning pair')
    pairs.add(pair)
  }
}

export function writeBmFontText(input: BmFontTextInput): string {
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > 8192) {
    throw new RangeError('Bitmap font pixel size must be an integer between 1 and 8192')
  }
  validateSlug(input.slug)
  validateInput(input)
  const chars = [...input.chars].sort((a, b) => a.id - b.id)
  const kernings = [...(input.kernings ?? [])].sort((a, b) => a.first - b.first || a.second - b.second)
  const lines = [
    `info face=${quote(input.face)} size=${-Math.abs(input.size)} unicode=1 bold=0 italic=0 charset="" stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1`,
    `common lineHeight=${input.lineHeight} base=${input.base} scaleW=${input.scaleW} scaleH=${input.scaleH} pages=1 packed=0`,
    `page id=0 file=${quote(`${input.slug}-g_0.png`)}`,
    `chars count=${chars.length}`,
    ...chars.map(
      (char) => `char id=${char.id} x=${char.x} y=${char.y} width=${char.width} height=${char.height} xoffset=${char.xoffset} yoffset=${char.yoffset} xadvance=${char.xadvance} page=0 chnl=15`
    )
  ]
  if (kernings.length) {
    lines.push(`kernings count=${kernings.length}`)
    lines.push(...kernings.map((kerning) => `kerning first=${kerning.first} second=${kerning.second} amount=${kerning.amount}`))
  }
  return `${lines.join('\n')}\n`
}

export function bmFontDescriptorFilename(slug: string): string {
  validateSlug(slug)
  return `${slug}-g.fnt`
}
