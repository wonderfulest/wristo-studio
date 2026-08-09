export const GARMIN_SYSTEM_PREVIEW_FONT = 'Arial, PingFang SC, Microsoft YaHei, sans-serif'

export function containsChineseText(content: unknown): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(String(content ?? ''))
}

export function resolvePreviewFontFamily(content: unknown, customFamily: string): string {
  return containsChineseText(content) ? GARMIN_SYSTEM_PREVIEW_FONT : customFamily
}

export interface DefaultTextFont {
  family: string
  size: number
}

export function normalizeLegacyTextFont(
  value: Record<string, unknown>,
  fallback: DefaultTextFont,
): { fontFamily: string; fontSize: number } {
  if (value.fontSource !== 'system') {
    return {
      fontFamily: String(value.fontFamily || fallback.family),
      fontSize: Number(value.fontSize || fallback.size),
    }
  }
  return {
    fontFamily: String(value.assetFontFamily || fallback.family),
    fontSize: Number(value.assetFontSize || fallback.size),
  }
}
