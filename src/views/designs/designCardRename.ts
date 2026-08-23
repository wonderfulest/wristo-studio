export type DesignRenameResolution =
  | { action: 'submit'; name: string }
  | { action: 'cancel'; name: string }

export function resolveDesignRename(draftName: string, currentName: string): DesignRenameResolution {
  const name = draftName.trim()
  if (!name || name === currentName) {
    return { action: 'cancel', name: currentName }
  }
  return { action: 'submit', name }
}
