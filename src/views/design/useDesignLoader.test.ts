import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const loaderSource = readFileSync(new URL('./useDesignLoader.ts', import.meta.url), 'utf8')
const designSource = readFileSync(new URL('../Design.vue', import.meta.url), 'utf8')

describe('useDesignLoader contract', () => {
  it('guards asynchronous loading with a monotonic generation and serialized queue', () => {
    expect(loaderSource).toContain('let designLoadGeneration = 0')
    expect(loaderSource).toContain('let designLoadQueue: Promise<void> = Promise.resolve()')
    expect(loaderSource).toContain('const generation = ++designLoadGeneration')
    expect(loaderSource).toContain('if (!isCurrentDesignLoad(generation)) return')
    expect(loaderSource).toContain('designLoadGeneration += 1')
  })

  it('projects the default theme after fonts and before themes, properties, and elements', () => {
    const applyStart = loaderSource.indexOf('const applyRuntimeDesignConfig = async')
    const fontFetch = loaderSource.indexOf('await fontStore.fetchFonts()', applyStart)
    const generationGuard = loaderSource.indexOf('if (!isCurrentDesignLoad(generation)) return false', fontFetch)
    const projection = loaderSource.indexOf('const loadConfig = projectDefaultVisualThemeForLoad(config)', generationGuard)
    const hydrate = loaderSource.indexOf('visualThemeStore.hydrate(', projection)
    const properties = loaderSource.indexOf('propertiesStore.loadProperties(loadConfig.properties)', hydrate)
    const elements = loaderSource.indexOf('const runtimeElements = loadConfig.elements as AnyElementConfig[]', properties)

    expect(applyStart).toBeGreaterThan(-1)
    expect(fontFetch).toBeGreaterThan(applyStart)
    expect(generationGuard).toBeGreaterThan(fontFetch)
    expect(projection).toBeGreaterThan(generationGuard)
    expect(hydrate).toBeGreaterThan(projection)
    expect(properties).toBeGreaterThan(hydrate)
    expect(elements).toBeGreaterThan(properties)
  })

  it('uses ElementManager and clears legacy property state', () => {
    expect(loaderSource).toContain('await addElement(element.eleType as any, config as any)')
    expect(loaderSource).toContain('propertiesStore.clearProperties()')
    expect(loaderSource).toContain('visualThemeStore.hydrate(loadConfig.visualThemes)')
  })

  it('owns both API and WRT loading outside the page coordinator', () => {
    expect(loaderSource).toContain('const loadDesign = async')
    expect(loaderSource).toContain('const importWrtDesign = async')
    expect(loaderSource).toContain('clearRestoredDesignAssetUrls()')
    expect(designSource).toContain("import { useDesignLoader } from '@/views/design/useDesignLoader'")
    expect(designSource).not.toContain('const applyRuntimeDesignConfig = async')
    expect(designSource).not.toContain('const loadElements = async')
  })

  it('hydrates non-Latin language support through the shared normalizer', () => {
    expect(loaderSource).toContain('normalizeNonLatinLanguageSupport')
    expect(loaderSource).toContain('designStore.setNonLatinLanguageSupport(')
    expect(loaderSource).toContain('localization.nonLatinLanguageSupport')
  })
})
