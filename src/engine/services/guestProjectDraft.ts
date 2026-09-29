import { captureProjectSnapshot, accessProjectDraft, restoreProjectSnapshot } from './localProjectSnapshot'
import { packageFonts, packageFontBuildFiles, packageBitmapChars, packageArchiveExtras } from './packageAssetRegistry'
import { useFontStore } from '@/stores/fontStore'
import { localProjectDraftKey } from '@/auth/guestProject'
import type { RuntimeDesignConfig } from '@/types/app/config'

const writes = new Map<string, Promise<void>>()

export async function writeLocalProject(id: string, config: RuntimeDesignConfig) {
  const serialized = JSON.stringify(config)
  const fonts = [...new Map([...useFontStore().serverFonts, ...packageFonts]).values()]
    .filter(font => serialized.includes(JSON.stringify(font.slug)))
  const snapshot = captureProjectSnapshot({ config, bitmapChars: [...packageBitmapChars] }, fonts)
  const fontBuildFiles = new Map(packageFontBuildFiles)
  const archiveExtras = structuredClone(packageArchiveExtras)
  const captured = snapshot.then(value => ({ value }), error => ({ error }))
  const write = (writes.get(id) || Promise.resolve()).catch(() => undefined).then(async () => {
    const result = await captured
    if ('error' in result) throw result.error
    await accessProjectDraft(localProjectDraftKey(id), 'write', {
      ...result.value, savedAt: Date.now(), fontBuildFiles, archiveExtras,
    })
  })
  writes.set(id, write)
  try { await write } finally { if (writes.get(id) === write) writes.delete(id) }
}

export async function readLocalProject(id: string): Promise<RuntimeDesignConfig | undefined> {
  const draft = await accessProjectDraft(localProjectDraftKey(id), 'read')
  if (!draft) return undefined
  const restored = restoreProjectSnapshot(draft)
  packageFonts.clear()
  restored.fonts.forEach((font: any) => {
    packageFonts.set(font.slug, font)
    useFontStore().registerServerFont(font)
  })
  packageFontBuildFiles.clear()
  draft.fontBuildFiles?.forEach((files, slug) => packageFontBuildFiles.set(slug, files))
  packageBitmapChars.clear()
  restored.config.bitmapChars.forEach(([key, value]: any) => packageBitmapChars.set(key, value))
  packageArchiveExtras.files = draft.archiveExtras?.files || new Map()
  packageArchiveExtras.productImages = draft.archiveExtras?.productImages || []
  packageArchiveExtras.preview = draft.archiveExtras?.preview
  return restored.config.config
}
