import { defineStore } from 'pinia'
import { pageBitmapFonts, type BitmapFontVO, type BitmapFontPageQueryDTO } from '@/api/wristo/bitmapFont'

export interface BitmapFontStoreState {
  fonts: BitmapFontVO[]
  pageNum: number
  pageSize: number
  total: number
  loaded: boolean
}

const SESSION_KEY = 'wristo_bitmap_fonts_cache_v1'

interface BitmapFontSessionCache {
  fonts: BitmapFontVO[]
  pageNum: number
  pageSize: number
  total: number
}

export const useBitmapFontStore = defineStore('bitmapFontStore', {
  state: (): BitmapFontStoreState => ({
    fonts: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    loaded: false,
  }),

  actions: {
    loadFromSession() {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as BitmapFontSessionCache
        if (!parsed || !Array.isArray(parsed.fonts)) return
        this.fonts = parsed.fonts
        this.pageNum = parsed.pageNum || 1
        this.pageSize = parsed.pageSize || 10
        this.total = parsed.total || 0
        this.loaded = true
      } catch {
        // ignore corrupted cache
      }
    },

    saveToSession() {
      try {
        const payload: BitmapFontSessionCache = {
          fonts: this.fonts,
          pageNum: this.pageNum,
          pageSize: this.pageSize,
          total: this.total,
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
      } catch {
        // ignore quota exceeded
      }
    },

    clearSession() {
      try {
        sessionStorage.removeItem(SESSION_KEY)
      } catch {
        // ignore
      }
    },

    reset() {
      this.fonts = []
      this.pageNum = 1
      this.pageSize = 10
      this.total = 0
      this.loaded = false
      try {
        sessionStorage.removeItem(SESSION_KEY)
      } catch {}
    },

    async loadPage(page: number, pageSize?: number) {
      if (page <= 0) page = 1
      if (pageSize) this.pageSize = pageSize

      const dto: BitmapFontPageQueryDTO = {
        pageNum: page,
        pageSize: this.pageSize,
        isActive: 1,
      }
      const res = await pageBitmapFonts(dto)
      const data = res.data
      const list = (data?.list || []) as BitmapFontVO[]

      // 去重合并：按 id 合并现有与新列表
      if (page <= 1) {
        this.fonts = list
      } else {
        const merged = [...this.fonts]
        const exists = new Set<number>(merged.map(f => f.id))
        for (const font of list) {
          if (!exists.has(font.id)) {
            merged.push(font)
            exists.add(font.id)
          }
        }
        this.fonts = merged
      }

      this.pageNum = page
      this.total = data?.total || 0
      this.loaded = true
      this.saveToSession()
    },
  },
})
