import { canonicalJson, sha256Hex } from './deterministicEncoding'

export const BITMAP_FONT_SIZES = Object.freeze([
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54,
  60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204,
  216, 228, 240, 264, 288, 312,
] as const)

export type BitmapFontType = 'number_font' | 'text_font' | 'text_font_zh'
export type OutlineMode = 'fill' | 'fill-outline' | 'outline-only'

export interface BitmapFontRecipe {
  schemaVersion: 1
  rendererVersion: '1'
  fontWeight: number
  italicAngle: number
  outlineWidthEm: number
  outlineMode: OutlineMode
  lineJoin: 'round'
  antialias: true
}

export interface BitmapFontManifest {
  schemaVersion: 1
  slug: string
  type: BitmapFontType
  language: 'en' | 'zh'
  source: { fileName: string; sha256: string }
  sizes: number[]
  charset: { profile: string; codepoints: number[] }
  recipeSha256: string
  packageContentSha256: string
}

export interface BitmapFontCharset {
  profile: string
  codepoints: number[]
}

export interface BitmapFontSlugIdentity {
  baseName: string
  sourceSha256: string
  fontType: BitmapFontType
  recipe: BitmapFontRecipe
}

type BitmapFontRecipeInput = Omit<BitmapFontRecipe, 'lineJoin' | 'antialias'> &
  Partial<Pick<BitmapFontRecipe, 'lineJoin' | 'antialias'>>

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))

const finiteOrDefault = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback

export function charsetForType(type: BitmapFontType | string): BitmapFontCharset {
  if (type === 'number_font') {
    return {
      profile: 'wristo-number-v1',
      codepoints: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 176],
    }
  }

  if (type === 'text_font') {
    return {
      profile: 'wristo-text-en-v1',
      codepoints: [
        ...Array.from({ length: 95 }, (_, index) => 32 + index),
        176, 8208, 8211, 8217, 8230,
      ],
    }
  }

  if (type === 'text_font_zh') {
    const characters = '0123456789,:+-/.%°AMPKampkhH 零〇一二三四五六七八九十百千万星期周礼拜日天农历黄生肖阴阳闰正冬腊初廿卅月大小年甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥鼠牛虎兔龙蛇马羊猴鸡狗猪立春雨水惊蛰分清明谷夏满芒种至暑秋处白露寒霜降雪今昨时间秒上下早晚公节气元宵端夕中重除旦劳动国庆宜忌祭祀出行交易嫁娶入宅土安床开市远葬晴多云暴雷阵雾霾风沙冷暖热湿干新相弦盈亏步数心率静息电量温度卡路里压力睡眠血氧海拔指南针落活钟体感身恢复训练跑骑泳走应用名称代码访问解锁结果内制请在手表格式设置单位系统默认透主题短长无爬楼距离闹蓝牙通知勿扰模速紫外线最高低常良好优秀差目标完成剩余连接同层英情人妇女植树消费愚青儿童建党军教师圣夜平母父米尺摄氏华℃℉比号次每呼吸'
    return {
      profile: 'wristo-text-zh-v1',
      codepoints: Array.from(characters, character => character.codePointAt(0)!),
    }
  }

  throw new Error(`Unsupported bitmap font type: ${type}`)
}

export function normalizeBitmapFontRecipe(input: BitmapFontRecipeInput): BitmapFontRecipe {
  if (input.schemaVersion !== 1) {
    throw new Error(`Unsupported bitmap font recipe schema version: ${input.schemaVersion}`)
  }
  if (input.rendererVersion !== '1') {
    throw new Error(`Unsupported bitmap font renderer version: ${input.rendererVersion}`)
  }
  if (!(['fill', 'fill-outline', 'outline-only'] as const).includes(input.outlineMode)) {
    throw new Error(`Unsupported bitmap font outline mode: ${input.outlineMode}`)
  }

  return {
    schemaVersion: 1,
    rendererVersion: '1',
    fontWeight: clamp(finiteOrDefault(input.fontWeight, 400), 100, 900),
    italicAngle: clamp(finiteOrDefault(input.italicAngle, 0), -20, 20),
    outlineWidthEm: clamp(finiteOrDefault(input.outlineWidthEm, 0), 0, 0.5),
    outlineMode: input.outlineMode,
    lineJoin: 'round',
    antialias: true,
  }
}

const slugifyBitmapFontBase = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

export async function deriveBitmapFontSlug(identity: BitmapFontSlugIdentity): Promise<string> {
  const identityJson = canonicalJson({
    sourceSha256: identity.sourceSha256.toLowerCase(),
    fontType: identity.fontType,
    recipe: normalizeBitmapFontRecipe(identity.recipe),
  })
  const fingerprint = (await sha256Hex(new TextEncoder().encode(identityJson))).slice(0, 12)
  const maximumBaseLength = 191 - fingerprint.length - 1
  const base = (slugifyBitmapFontBase(identity.baseName) || 'bitmap-font')
    .slice(0, maximumBaseLength)
    .replace(/-+$/g, '')
  return `${base}-${fingerprint}`
}

const normalizeStyleTags = (value: string | string[]): string[] => {
  const parts = Array.isArray(value) ? value : value.split(/[,，\s]+/)
  return parts.map((tag) => tag.trim().toLowerCase()).filter(Boolean)
}

export function mergeBitmapFontStyleTags(
  recipe: BitmapFontRecipe,
  manualTags: string | string[],
): string[] {
  const normalized = normalizeBitmapFontRecipe(recipe)
  const generated: string[] = []
  if (normalized.fontWeight <= 300) generated.push('thin')
  else if (normalized.fontWeight <= 400) generated.push('regular')
  else if (normalized.fontWeight <= 600) generated.push('medium')
  else generated.push('bold')
  if (normalized.italicAngle !== 0) generated.push('italic')
  if (normalized.outlineMode !== 'outline-only') generated.push('fill')
  if (normalized.outlineMode !== 'fill' && normalized.outlineWidthEm > 0) generated.push('outline')
  return [...new Set([...generated, ...normalizeStyleTags(manualTags)])]
}

const normalizeSearchKeywords = (value: string | string[]): string[] => {
  const parts = (Array.isArray(value) ? value : [value]).flatMap(keyword => keyword.split(/[,，]+/))
  return parts.map(keyword => keyword.trim().toLowerCase()).filter(Boolean)
}

export function mergeBitmapFontSearchKeywords(
  fullName: string,
  fontType: BitmapFontType,
  recipe: BitmapFontRecipe,
  manualKeywords: string | string[],
): string[] {
  const generated = [
    fullName.trim().toLowerCase(),
    ...(fontType === 'number_font' ? ['number', 'time'] : fontType === 'text_font_zh' ? ['text', 'chinese', '中文'] : ['text']),
    'bitmap',
    ...mergeBitmapFontStyleTags(recipe, []),
  ].filter(Boolean)
  return [...new Set([...generated, ...normalizeSearchKeywords(manualKeywords)])]
}
