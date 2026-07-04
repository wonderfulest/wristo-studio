import { defineStore } from 'pinia'

export type PendingWeatherAmoledIcon = {
  fontSlug: string
  iconUnicode: string
  condition: string
  fileName: string
  file: File
  objectUrl: string
  updatedAt: number
}

const makeKey = (fontSlug: string, iconUnicode: string): string => {
  return `${String(fontSlug || '').trim()}::${String(iconUnicode || '').trim()}`
}

export const useWeatherAmoledIconStore = defineStore('weatherAmoledIcon', {
  state: () => ({
    pendingByKey: {} as Record<string, PendingWeatherAmoledIcon>,
  }),

  getters: {
    getPending: (state) =>
      (fontSlug: string, iconUnicode: string): PendingWeatherAmoledIcon | null => {
        return state.pendingByKey[makeKey(fontSlug, iconUnicode)] ?? null
      },

    listByFontSlugs: (state) =>
      (fontSlugs: string[]): PendingWeatherAmoledIcon[] => {
        const wanted = new Set(fontSlugs.map((slug) => String(slug || '').trim()).filter(Boolean))
        return Object.values(state.pendingByKey).filter((item) => wanted.has(item.fontSlug))
      },
  },

  actions: {
    upsertPending(input: {
      fontSlug: string
      iconUnicode: string
      condition: string
      file: File
    }) {
      const fontSlug = String(input.fontSlug || '').trim()
      const iconUnicode = String(input.iconUnicode || '').trim()
      if (!fontSlug || !iconUnicode || !input.file) return

      const key = makeKey(fontSlug, iconUnicode)
      const existing = this.pendingByKey[key]
      if (existing?.objectUrl) URL.revokeObjectURL(existing.objectUrl)

      this.pendingByKey[key] = {
        fontSlug,
        iconUnicode,
        condition: String(input.condition || iconUnicode).trim(),
        fileName: input.file.name,
        file: input.file,
        objectUrl: URL.createObjectURL(input.file),
        updatedAt: Date.now(),
      }
    },

    removePending(fontSlug: string, iconUnicode: string) {
      const key = makeKey(fontSlug, iconUnicode)
      const existing = this.pendingByKey[key]
      if (existing?.objectUrl) URL.revokeObjectURL(existing.objectUrl)
      delete this.pendingByKey[key]
    },

    clearAll() {
      Object.values(this.pendingByKey).forEach((item) => {
        if (item.objectUrl) URL.revokeObjectURL(item.objectUrl)
      })
      this.pendingByKey = {}
    },
  },
})
