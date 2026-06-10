import { defineStore } from 'pinia'

export const SUPPORTED_THEMES = ['light', 'dark'] as const
export type StudioTheme = typeof SUPPORTED_THEMES[number]

export const DEFAULT_THEME: StudioTheme = 'dark'

export function normalizeTheme(value: unknown): StudioTheme {
  const theme = String(value || '').toLowerCase()
  return SUPPORTED_THEMES.includes(theme as StudioTheme) ? (theme as StudioTheme) : DEFAULT_THEME
}

export const useThemeStore = defineStore('studio-theme', {
  state: () => ({
    currentTheme: DEFAULT_THEME as StudioTheme,
  }),
  actions: {
    setTheme(theme: string) {
      this.currentTheme = normalizeTheme(theme)
      this.syncDocumentTheme()
    },
    toggleTheme() {
      this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark')
    },
    syncDocumentTheme() {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.studioTheme = this.currentTheme
        document.documentElement.classList.toggle('dark', this.currentTheme === 'dark')
      }
    },
  },
  persist: {
    key: 'wristo-studio-theme',
    storage: localStorage,
  },
})
