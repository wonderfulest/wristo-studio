import { resolvePreviewFontFamily } from '@/utils/contentFontFallback'

export interface TextFontPreviewConfig {
  fontFamily?: string
  fontSize?: number
}

export const resolveCurrentElementPreviewFont = (
  config: TextFontPreviewConfig,
  content: unknown = '',
): Record<string, unknown> => ({
  fontFamily: resolvePreviewFontFamily(content, String(config.fontFamily || 'sans-serif')),
  fontSize: config.fontSize,
})
