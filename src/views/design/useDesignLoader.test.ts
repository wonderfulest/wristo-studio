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
    const projection = loaderSource.indexOf('const projectedConfig = projectDefaultVisualThemeForLoad(config)', generationGuard)
    const hydrate = loaderSource.indexOf('visualThemeStore.hydrate(', projection)
    const normalization = loaderSource.indexOf('normalizeDataPropertyConfig(loadConfig, dataCatalogStore.options)', hydrate)
    const properties = loaderSource.indexOf('propertiesStore.loadDataPropertyConfig(', normalization)
    const elements = loaderSource.indexOf('const runtimeElements = (loadConfig.elements as AnyElementConfig[]).map', properties)

    expect(applyStart).toBeGreaterThan(-1)
    expect(fontFetch).toBeGreaterThan(applyStart)
    expect(generationGuard).toBeGreaterThan(fontFetch)
    expect(projection).toBeGreaterThan(generationGuard)
    expect(hydrate).toBeGreaterThan(projection)
    expect(normalization).toBeGreaterThan(hydrate)
    expect(properties).toBeGreaterThan(normalization)
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

  it('does not hydrate removed font policy', () => {
    expect(loaderSource).not.toContain('normalizeNonLatinLanguageSupport')
    expect(loaderSource).not.toContain('setNonLatinLanguageSupport')
    expect(loaderSource).not.toContain('localization.fontRoles')
  })

  it('hydrates exclusions for populated designs and clears them for blank or legacy designs', () => {
    const populatedStart = loaderSource.indexOf("designStore.setAppLanguage((loadConfig.localization as any)?.appLanguage)")
    const blankStart = loaderSource.indexOf('} else {', loaderSource.indexOf('if (Array.isArray(loadConfig.elements))'))

    expect(loaderSource.indexOf('designStore.setConnectIqSettingsExcludedDataTypeValues([])', blankStart)).toBeGreaterThan(blankStart)
    expect(loaderSource.indexOf('designStore.setConnectIqSettingsExcludedDataTypeValues(', populatedStart)).toBeGreaterThan(populatedStart)
    expect(loaderSource).toContain('loadConfig.connectIqSettingsExcludedDataTypeValues')
  })

  it('loads only the single application-language metadata field', () => {
    expect(loaderSource).toContain("designStore.setAppLanguage((loadConfig.localization as any)?.appLanguage)")
    expect(loaderSource).not.toContain('supportedLocales')
    expect(loaderSource).not.toContain('supportsChineseContent')
  })

  it('restores the shared bitmap icon font strategy from the loaded design', () => {
    expect(loaderSource).toContain('useIconFontStrategyStore')
    expect(loaderSource).toContain('resolveLoadedIconFontSlug(loadConfig.elements)')
    expect(loaderSource).toContain('iconFontStrategyStore.setIconFontSlug(loadedIconFontSlug)')
  })
})
