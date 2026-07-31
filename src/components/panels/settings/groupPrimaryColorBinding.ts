export interface PrimaryColorElement {
  fill?: unknown
  fillProperty?: unknown
}

export interface PrimaryColorSelection {
  color: string
  propertyKey: string | null
}

export interface SharedPrimaryColorBinding {
  color: string
  propertyKey: string
  mixedColor: boolean
  mixedProperty: boolean
}

const normalizeColor = (value: unknown): string => {
  const color = String(value ?? '').trim()
  return color || '#FFFFFF'
}

const normalizePropertyKey = (value: unknown): string => String(value ?? '').trim()

export function resolveSharedPrimaryColorBinding(
  elements: PrimaryColorElement[],
): SharedPrimaryColorBinding {
  const colors = elements.map((element) => normalizeColor(element.fill))
  const propertyKeys = elements.map((element) => normalizePropertyKey(element.fillProperty))
  const color = colors[0] ?? '#FFFFFF'
  const propertyKey = propertyKeys[0] ?? ''
  const mixedColor = colors.some((candidate) => candidate !== color)
  const mixedProperty = propertyKeys.some((candidate) => candidate !== propertyKey)

  return {
    color,
    propertyKey: mixedProperty ? '' : propertyKey,
    mixedColor,
    mixedProperty,
  }
}

export function buildPrimaryColorBindingPatch(
  selection: PrimaryColorSelection,
): { fill: string; fillProperty: string | null } {
  return {
    fill: selection.color,
    fillProperty: selection.propertyKey?.trim() || null,
  }
}
