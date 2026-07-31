import { normalizeBindingColor } from './explicitColorBindingService'
import { VISUAL_THEME_COLOR_BINDINGS } from './visualThemeElementFields'

export type ColorBindingElementRecord = Record<string, unknown> & {
  id?: string | number
}

export const buildBoundColorPatches = (
  elements: ColorBindingElementRecord[],
  propertyKey: string,
  color: unknown,
): Map<string, Record<string, string>> => {
  const normalizedColor = normalizeBindingColor(color)
  const normalizedPropertyKey = String(propertyKey ?? '').trim()
  const patches = new Map<string, Record<string, string>>()
  if (!normalizedColor || !normalizedPropertyKey) return patches

  elements.forEach((element) => {
    if (element.id == null) return
    const id = String(element.id)
    const patch = { ...(patches.get(id) || {}) }
    VISUAL_THEME_COLOR_BINDINGS.forEach(([colorField, propertyField]) => {
      if (element[propertyField] === normalizedPropertyKey) {
        patch[colorField] = normalizedColor
      }
    })
    if (Object.keys(patch).length > 0) patches.set(id, patch)
  })

  return patches
}
