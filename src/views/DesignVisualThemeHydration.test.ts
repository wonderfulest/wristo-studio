import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./Design.vue', import.meta.url), 'utf8')

describe('Design visual theme hydration ordering', () => {
  it('hydrates only after the post-font generation guard', () => {
    const applyStart = source.indexOf('const applyRuntimeDesignConfig = async')
    const fontFetch = source.indexOf('await fontStore.fetchFonts()', applyStart)
    const generationGuard = source.indexOf('if (!isCurrentDesignLoad(generation)) return false', fontFetch)
    const hydrate = source.indexOf('visualThemeStore.hydrate(config.visualThemes)', applyStart)

    expect(applyStart).toBeGreaterThan(-1)
    expect(fontFetch).toBeGreaterThan(applyStart)
    expect(generationGuard).toBeGreaterThan(fontFetch)
    expect(hydrate).toBeGreaterThan(generationGuard)
  })

  it('passes undefined through hydrate so loading a legacy design clears prior themes', () => {
    expect(source).toContain('visualThemeStore.hydrate(config.visualThemes)')
    expect(source).not.toContain('if (config.visualThemes) visualThemeStore.hydrate')
  })
})
