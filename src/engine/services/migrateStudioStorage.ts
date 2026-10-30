import { captureProjectSnapshot, type StoredProjectDraft } from './localProjectSnapshot'
import { updateStudioRecord } from './studioStorage'

/** Retryable migration. Unreadable entries remain untouched; conflicts are archived losslessly. */
export async function migrateStudioStorage(storage: Storage): Promise<void> {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(Boolean)
  for (const key of keys) {
    const isDraft = key.startsWith('wristo:studio:design-draft:v1:')
    if (!isDraft && !key.startsWith('studio-ai-adjust:')) continue
    const raw = storage.getItem(key)
    if (!raw) continue
    let parsed: any
    try { parsed = JSON.parse(raw) } catch { continue }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    if (!isDraft && parsed.pending && (typeof parsed.pending.id !== 'string' || !parsed.pending.request)) continue
    let value: any = parsed
    if (isDraft) {
      if (parsed.version !== 1 || !parsed.config || !Number.isFinite(parsed.savedAt)) continue
      // Legacy object URLs may already be expired. Keep the original if bytes cannot be recovered.
      try {
        value = { ...await captureProjectSnapshot({ config: parsed.config, bitmapChars: [] }, []), savedAt: parsed.savedAt }
      } catch { continue }
    }
    let conflict = false
    const stored = await updateStudioRecord<StoredProjectDraft | any>(isDraft ? 'drafts' : 'conversations', key, old => {
      conflict = old !== undefined && JSON.stringify(old) !== JSON.stringify(value)
      return old ?? value
    })
    if (conflict) {
      // No overwrite, including equal-sized legacy revisions. Keep conflicting unsynced data.
      await updateStudioRecord<Array<{ raw: string; snapshot: typeof value }>>('legacy', key, old => old?.some(entry => entry.raw === raw) ? old : [...(old || []), { raw, snapshot: value }])
      if (!isDraft && parsed.pending && parsed.pending.id !== stored?.pending?.id) continue
    }
    if (storage.getItem(key) === raw) storage.removeItem(key)
  }
}
