import type { ExpressionTokenDefinition } from '@/engine/expression/types'
import type { SupportedLocale } from '@/stores/locale'

export function resolveEnumPreviewOptions(
  values: NonNullable<ExpressionTokenDefinition['enumValues']>,
  locale: SupportedLocale,
): Array<{ value: number; text: string }> {
  const useChinese = String(locale).startsWith('zh')
  return values.map((item) => ({
    value: item.value,
    text: `${useChinese ? (item.labelCn || item.label) : item.label} ${item.value}`,
  }))
}
