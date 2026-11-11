// Only editor loads and acknowledged saves may advance this baseline.
// Background detail fetches must never silently authorize a stale editor to overwrite.
const versions = new Map<string, number>()
export function rememberDesignSaveVersion(uid: string, version: unknown): void {
  if (typeof version === 'number' && Number.isSafeInteger(version) && version >= 0) versions.set(uid, version)
  else versions.delete(uid)
}
export function getDesignSaveVersion(uid: string): number | undefined {
  return versions.get(uid)
}
