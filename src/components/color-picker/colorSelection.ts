export interface ColorSelectionInput {
  hex?: string
  value?: string
  propertyKey?: string
}

export interface ColorSelectionPayload {
  color: string
  propertyKey: string | null
}

export const toColorSelectionPayload = (
  selection?: ColorSelectionInput,
): ColorSelectionPayload => ({
  color: String(selection?.hex || '#ffffff'),
  propertyKey: selection?.propertyKey ? String(selection.propertyKey) : null,
})
