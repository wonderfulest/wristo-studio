import { DataTypeOptions } from '@/config/elements/options/dataTypes'
import type { AmoledIconCandidate } from '@/types/amoledIcons'
import { normalizeIconUnicode } from '@/types/amoledIcons'
import type { AnyElementConfig } from '@/types/elements'

const findDataOption = (input: { metricSymbol?: string; iconUnicode?: string }) => {
  const iconUnicode = normalizeIconUnicode(input.iconUnicode)
  return DataTypeOptions.find((option) => {
    if (input.metricSymbol && option.metricSymbol === input.metricSymbol) return true
    return iconUnicode && normalizeIconUnicode(option.iconUnicode || option.icon) === iconUnicode
  })
}

export const getAmoledIconCandidateFromElement = (element: Partial<AnyElementConfig> | null | undefined): AmoledIconCandidate | null => {
  if (!element || (element as any).eleType !== 'icon') return null
  const metricSymbol = String((element as any).metricSymbol || '').trim()
  const option = findDataOption({ metricSymbol })
  const iconUnicode = normalizeIconUnicode((option as any)?.iconUnicode || (option as any)?.icon || (element as any).iconUnicode || (element as any).text)
  if (!iconUnicode) return null
  return {
    iconUnicode,
    symbolCode: String((option as any)?.value || '').trim() || undefined,
    metricSymbol: metricSymbol || undefined,
    label: String((option as any)?.label || (option as any)?.enLabel || '').trim() || iconUnicode,
    source: 'from-element',
  }
}
