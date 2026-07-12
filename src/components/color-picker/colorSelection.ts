export interface ColorSelectionInput {
  hex?: string
  value?: string
  propertyKey?: string
}

export interface ColorSelectionPayload {
  color: string
  propertyKey: string
}

export const toColorSelectionPayload = (
  selection?: ColorSelectionInput,
): ColorSelectionPayload => ({
  color: String(selection?.hex || '#ffffff'),
  propertyKey: String(selection?.propertyKey || ''),
})
