import { defineStore } from 'pinia'

export const glyphChars = ['0','1','2','3','4','5','6','7','8','9',':'] as const
export type GlyphChar = (typeof glyphChars)[number]

export interface NumberGlyphState {
  visible: boolean
  glyphFiles: Record<GlyphChar, File | null>
  glyphPreviews: Record<GlyphChar, string | null>
}

const createEmptyFiles = (): Record<GlyphChar, File | null> => ({
  '0': null,
  '1': null,
  '2': null,
  '3': null,
  '4': null,
  '5': null,
  '6': null,
  '7': null,
  '8': null,
  '9': null,
  ':': null,
})

const createEmptyPreviews = (): Record<GlyphChar, string | null> => ({
  '0': null,
  '1': null,
  '2': null,
  '3': null,
  '4': null,
  '5': null,
  '6': null,
  '7': null,
  '8': null,
  '9': null,
  ':': null,
})

export const useNumberGlyphStore = defineStore('numberGlyphStore', {
  state: (): NumberGlyphState => ({
    visible: false,
    glyphFiles: createEmptyFiles(),
    glyphPreviews: createEmptyPreviews(),
  }),
  // 持久化到 localStorage，刷新后仍保留当前编辑的 glyph 状态
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'number-glyph-store',
        storage: localStorage,
        // 只持久化简单可序列化字段，避免 File/blob 反序列化为普通对象导致错误
        paths: ['visible'],
      },
    ],
  } as any,
  actions: {
    setVisible(v: boolean) {
      this.visible = v
    },
    setGlyphFile(ch: GlyphChar, file: File | null) {
      this.glyphFiles[ch] = file
    },
    setGlyphPreview(ch: GlyphChar, url: string | null) {
      this.glyphPreviews[ch] = url
    },
    resetAll() {
      // 释放旧预览 URL，避免内存泄露
      for (const ch of glyphChars) {
        const url = this.glyphPreviews[ch]
        if (url) {
          URL.revokeObjectURL(url)
        }
      }
      this.glyphFiles = createEmptyFiles()
      this.glyphPreviews = createEmptyPreviews()
      this.visible = false
    },
  },
})
