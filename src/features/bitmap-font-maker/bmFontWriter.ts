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
  size: number
  lineHeight: number
  base: number
  scaleW: number
  scaleH: number
  chars: BmFontChar[]
  kernings?: BmFontKerning[]
}

const quote = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

export function writeBmFontText(input: BmFontTextInput): string {
  const chars = [...input.chars].sort((a, b) => a.id - b.id)
  const kernings = [...(input.kernings ?? [])].sort((a, b) => a.first - b.first || a.second - b.second)
  const lines = [
    `info face=${quote(input.face)} size=${input.size} unicode=1 bold=0 italic=0 charset="" stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1`,
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
  return `${slug}-g.fnt`
}
