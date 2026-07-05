import { defineStore } from 'pinia'
import { normalizeIconUnicode } from '@/types/amoledIcons'

export type PendingAmoledIconAsset = {
  fontSlug: string
  iconUnicode: string
  fileName: string
  file: File
  objectUrl: string
  sourceUrl?: string
  assetId?: number
  updatedAt: number
}

const makeKey = (fontSlug: string, iconUnicode: string): string => {
  return `${String(fontSlug || '').trim()}::${normalizeIconUnicode(iconUnicode)}`
}

const revokeObjectUrl = (url?: string) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const useAmoledIconAssetStore = defineStore('amoledIconAsset', {
  state: () => ({
    pendingByKey: {} as Record<string, PendingAmoledIconAsset>,
  }),

  getters: {
    getPending: (state) =>
      (fontSlug: string, iconUnicode: string): PendingAmoledIconAsset | null => {
        return state.pendingByKey[makeKey(fontSlug, iconUnicode)] ?? null
      },

    getDisplayUrl: (state) =>
      (fontSlug: string, iconUnicode: string): string => {
        const pending = state.pendingByKey[makeKey(fontSlug, iconUnicode)]
        return pending?.objectUrl || pending?.sourceUrl || ''
      },

    listByFontSlug: (state) =>
      (fontSlug: string): PendingAmoledIconAsset[] => {
        const wanted = String(fontSlug || '').trim()
        return Object.values(state.pendingByKey).filter((item) => item.fontSlug === wanted)
      },
  },

  actions: {
    upsertPending(input: {
      fontSlug: string
      iconUnicode: string
      file: File
      sourceUrl?: string
      assetId?: number
    }) {
      const fontSlug = String(input.fontSlug || '').trim()
      const iconUnicode = normalizeIconUnicode(input.iconUnicode)
      if (!fontSlug || !iconUnicode || !input.file) {
        console.warn('[amoled-icon-store] skip upsertPending: missing required field', {
          fontSlug,
          iconUnicode,
          hasFile: Boolean(input.file),
          fileName: input.file?.name,
        })
        return
      }

      const key = makeKey(fontSlug, iconUnicode)
      const existing = this.pendingByKey[key]
      revokeObjectUrl(existing?.objectUrl)
      const objectUrl = URL.createObjectURL(input.file)

      this.pendingByKey[key] = {
        fontSlug,
        iconUnicode,
        fileName: input.file.name,
        file: input.file,
        objectUrl,
        sourceUrl: String(input.sourceUrl || '').trim() || undefined,
        assetId: Number.isFinite(Number(input.assetId)) ? Number(input.assetId) : undefined,
        updatedAt: Date.now(),
      }
      console.log('[amoled-icon-store] upsertPending', {
        key,
        fontSlug,
        iconUnicode,
        fileName: input.file.name,
        fileType: input.file.type,
        fileSize: input.file.size,
        objectUrl,
        sourceUrl: input.sourceUrl,
        assetId: input.assetId,
      })
    },

    removePending(fontSlug: string, iconUnicode: string) {
      const key = makeKey(fontSlug, iconUnicode)
      const existing = this.pendingByKey[key]
      revokeObjectUrl(existing?.objectUrl)
      delete this.pendingByKey[key]
      console.log('[amoled-icon-store] removePending', { key, fontSlug, iconUnicode: normalizeIconUnicode(iconUnicode), hadExisting: Boolean(existing) })
    },

    clearAll() {
      const count = Object.keys(this.pendingByKey).length
      Object.values(this.pendingByKey).forEach((item) => {
        revokeObjectUrl(item.objectUrl)
      })
      this.pendingByKey = {}
      console.log('[amoled-icon-store] clearAll', { count })
    },
  },
})
