import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Studio locales', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  it('only exposes English and Chinese in the language selector', async () => {
    const { SUPPORTED_LOCALES } = await import('./locale')

    expect(SUPPORTED_LOCALES).toEqual(['en', 'zh'])
  })

  it('falls back to English for a previously stored unsupported locale', async () => {
    const { normalizeLocale } = await import('./locale')

    expect(normalizeLocale('fr')).toBe('en')
    expect(normalizeLocale('zh-tw')).toBe('en')
  })
})
