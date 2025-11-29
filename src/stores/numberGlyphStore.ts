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
