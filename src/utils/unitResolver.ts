import type { DataUnitDefinition } from '@/types/dataCatalog'

export interface PreviewDeviceContext {
  readonly language: 'eng' | 'zhs'
  readonly distanceUnits: 'metric' | 'statute'
  readonly temperatureUnits: 'metric' | 'statute'
}

export function resolveUnitVariant(
  unit: DataUnitDefinition,
  context: PreviewDeviceContext,
  providerUnit?: string,
): string | null {
  const policy = unit.selectionPolicy
  if (policy.type === 'none') return null
  if (policy.type === 'fixed') return policy.variant
  if (policy.type === 'deviceSetting') return policy.mapping[context[policy.setting]]

  const raw = providerUnit?.trim()
  if (!raw) return policy.fallbackVariant ?? null
  if (Object.prototype.hasOwnProperty.call(unit.variants, raw)) return raw
  const normalized = raw.toLowerCase()
  for (const [variantKey, variant] of Object.entries(unit.variants)) {
    if (variant.aliases.includes(normalized)) return variantKey
  }
  throw new Error(`unitKey ${unit.unitKey}: unknown runtime unit alias "${providerUnit}"`)
}

export function resolveUnitLabel(
  unit: DataUnitDefinition,
  variantKey: string | null,
  language: 'eng' | 'zhs',
): string {
  if (unit.selectionPolicy.type === 'none') return ''
  const variant = variantKey ? unit.variants[variantKey] : undefined
  if (!variant) throw new Error(`unitKey ${unit.unitKey}: variant ${String(variantKey)} is missing`)
  return variant.label[language]
}
