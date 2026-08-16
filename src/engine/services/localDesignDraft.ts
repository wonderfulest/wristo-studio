import type { RuntimeDesignConfig } from '@/types/app/config'

const LOCAL_DESIGN_DRAFT_PREFIX = 'wristo:studio:design-draft:v1'

export interface LocalDesignDraft {
  version: 1
  designId: string
  deviceKey: string
  savedAt: number
  config: RuntimeDesignConfig
}

export interface WriteLocalDesignDraftInput {
  designId: string
  deviceKey: string
  savedAt: number
  config: RuntimeDesignConfig
}

export function buildLocalDesignDraftKey(designId: string, deviceKey: string): string {
  return `${LOCAL_DESIGN_DRAFT_PREFIX}:${encodeURIComponent(designId)}:${encodeURIComponent(deviceKey)}`
}

export function writeLocalDesignDraft(storage: Storage, input: WriteLocalDesignDraftInput): void {
  const draft: LocalDesignDraft = { version: 1, ...input }
  storage.setItem(buildLocalDesignDraftKey(input.designId, input.deviceKey), JSON.stringify(draft))
}

export function readLocalDesignDraft(
  storage: Storage,
  designId: string,
  deviceKey: string,
): LocalDesignDraft | null {
  const raw = storage.getItem(buildLocalDesignDraftKey(designId, deviceKey))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<LocalDesignDraft>
    if (
      parsed.version !== 1
      || parsed.designId !== designId
      || parsed.deviceKey !== deviceKey
      || !Number.isFinite(parsed.savedAt)
      || !parsed.config
      || typeof parsed.config !== 'object'
    ) return null
    return parsed as LocalDesignDraft
  } catch {
    return null
  }
}

export function removeLocalDesignDraft(storage: Storage, designId: string, deviceKey: string): void {
  storage.removeItem(buildLocalDesignDraftKey(designId, deviceKey))
}

export async function resolveLocalDesignDraft(options: {
  storage: Storage
  designId: string
  deviceKey: string
  serverConfig: RuntimeDesignConfig
  confirmRestore: (draft: LocalDesignDraft) => Promise<boolean>
}): Promise<RuntimeDesignConfig> {
  const draft = readLocalDesignDraft(options.storage, options.designId, options.deviceKey)
  if (!draft) return options.serverConfig
  if (await options.confirmRestore(draft)) return draft.config
  removeLocalDesignDraft(options.storage, options.designId, options.deviceKey)
  return options.serverConfig
}

export function createLocalDesignDraftAutosave(save: () => void) {
  let dirty = false

  return {
    markDirty(): void {
      dirty = true
    },
    markClean(): void {
      dirty = false
    },
    saveIfDirty(): boolean {
      if (!dirty) return false
      save()
      dirty = false
      return true
    },
    isDirty(): boolean {
      return dirty
    },
  }
}
