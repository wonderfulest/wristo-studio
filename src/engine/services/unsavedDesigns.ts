/** Only metadata lives here; design assets remain in the existing draft store. */
export interface UnsavedDesign {
  designId: string
  name: string
  savedAt: number
}
const key = (owner: string | number) => `wristo:studio:unsaved-designs:v1:${encodeURIComponent(owner)}`
export function readUnsavedDesigns(storage: Pick<Storage, 'getItem'>, owner: string | number): UnsavedDesign[] {
  try {
    const values = JSON.parse(storage.getItem(key(owner)) || '[]')
    return Array.isArray(values) ? values.filter((v): v is UnsavedDesign =>
      v && typeof v.designId === 'string' && !!v.designId && typeof v.name === 'string' && Number.isFinite(v.savedAt),
    ).sort((a, b) => b.savedAt - a.savedAt) : []
  } catch { return [] }
}
export function rememberUnsavedDesign(storage: Pick<Storage, 'getItem' | 'setItem'>, owner: string | number, design: UnsavedDesign): void {
  try {
    storage.setItem(key(owner), JSON.stringify([design, ...readUnsavedDesigns(storage, owner).filter(v => v.designId !== design.designId)]))
  } catch (error) { console.warn('Unable to remember the unsaved design:', error) }
}
export function forgetUnsavedDesign(storage: Pick<Storage, 'getItem' | 'setItem'>, owner: string | number, id: string): void {
  try {
    storage.setItem(key(owner), JSON.stringify(readUnsavedDesigns(storage, owner).filter(v => v.designId !== id)))
  } catch (error) { console.warn('Unable to update unsaved designs:', error) }
}
