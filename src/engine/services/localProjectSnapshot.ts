import { updateStudioRecord } from './studioStorage'
/** Browser drafts store bytes in IndexedDB, never session-bound object URLs. */
export interface ProjectSnapshot<T = any, F = any> {
  config: T
  fonts: F[]
  assets: Record<string, Blob>
}

export async function captureProjectSnapshot<T, F>(config: T, fonts: F[]): Promise<ProjectSnapshot<T, F>> {
  const assets: Record<string, Blob> = {}
  const references = new Map<string, string>()
  const pending: Promise<void>[] = []
  const visit = (value: any): any => {
    if (typeof value === 'string' && value.startsWith('blob:')) {
      let ref = references.get(value)
      if (!ref) {
        ref = `local-asset://${references.size}`
        references.set(value, ref)
        const assetRef = ref
        // Start all requests before yielding, so canvas teardown cannot revoke unread URLs.
        pending.push(fetch(value).then(async (response) => {
          if (!response.ok) throw new Error('Unable to save local project asset')
          assets[assetRef] = await response.blob()
        }))
      }
      return ref
    }
    if (Array.isArray(value)) return value.map(visit)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
    return value
  }
  const result = { config: visit(config), fonts: visit(fonts), assets }
  await Promise.all(pending)
  return result
}

export function restoreProjectSnapshot<T, F>(snapshot: ProjectSnapshot<T, F>): { config: T; fonts: F[] } {
  const urls = new Map<string, string>()
  const visit = (value: any): any => {
    if (typeof value === 'string' && value.startsWith('local-asset://')) {
      if (!snapshot.assets[value]) throw new Error(`Local draft asset is missing: ${value}`)
      if (!urls.has(value)) urls.set(value, URL.createObjectURL(snapshot.assets[value]))
      return urls.get(value)
    }
    if (Array.isArray(value)) return value.map(visit)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
    return value
  }
  return { config: visit(snapshot.config), fonts: visit(snapshot.fonts) }
}

export interface StoredProjectDraft extends ProjectSnapshot {
  revision?: string
  savedAt: number
  fontBuildFiles?: Map<string, Map<string, Blob>>
  archiveExtras?: typeof import('./packageAssetRegistry').packageArchiveExtras
}
export async function accessProjectDraft(key: string, action: 'read' | 'write' | 'delete', draft?: StoredProjectDraft): Promise<StoredProjectDraft | undefined> {
  return updateStudioRecord<StoredProjectDraft>('drafts', key, action === 'read' ? undefined : old => {
    if (action === 'delete') return undefined
    return old && old.savedAt > draft!.savedAt ? old : draft
  })
}

/** A cloud save can only remove the exact local snapshot it acknowledged. */
export async function removeSavedProjectDraft(key: string, savedAt: number, revision?: string): Promise<boolean> {
  let removed = false
  await updateStudioRecord<StoredProjectDraft>('drafts', key, old => {
    if (old?.savedAt === savedAt && old.revision === revision) { removed = true; return undefined }
    return old
  })
  return removed
}
