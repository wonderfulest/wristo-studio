export interface UploadFontTypeOption {
  name: string
  value: string
}

const CHINESE_TEXT_FONT_TYPE = 'text_font_zh'

export const filterUploadFontTypes = <T extends UploadFontTypeOption>(options: T[]): T[] =>
  options.filter(option => option.value !== CHINESE_TEXT_FONT_TYPE)

export const getUploadFontLanguageOptions = (): string[] => ['en', 'zh']
