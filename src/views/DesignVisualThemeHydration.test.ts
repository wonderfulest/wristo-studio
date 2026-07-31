import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./Design.vue', import.meta.url), 'utf8')

describe('Design visual theme hydration ordering', () => {
  it('projects the default theme before loading themes, properties, and elements', () => {
    const applyStart = source.indexOf('const applyRuntimeDesignConfig = async')
    const projection = source.indexOf('const loadConfig = projectDefaultVisualThemeForLoad(config)', applyStart)
    const hydrate = source.indexOf('visualThemeStore.hydrate(', applyStart)
    const properties = source.indexOf('propertiesStore.loadProperties(loadConfig.properties)', applyStart)
    const elements = source.indexOf('const runtimeElements = loadConfig.elements as AnyElementConfig[]', applyStart)

    expect(source).toContain(
      "import { projectDefaultVisualThemeForLoad } from '@/engine/services/defaultVisualThemeLoadService'",
    )
    expect(projection).toBeGreaterThan(applyStart)
    expect(hydrate).toBeGreaterThan(projection)
    expect(properties).toBeGreaterThan(hydrate)
    expect(elements).toBeGreaterThan(properties)
    expect(source).toContain('loadConfig.visualThemes,')
    expect(source).toContain(
      'loadConfig.elements as unknown as Array<Record<string, unknown>>',
    )
  })

  it('hydrates only after the post-font generation guard', () => {
    const applyStart = source.indexOf('const applyRuntimeDesignConfig = async')
    const fontFetch = source.indexOf('await fontStore.fetchFonts()', applyStart)
    const generationGuard = source.indexOf('if (!isCurrentDesignLoad(generation)) return false', fontFetch)
    const hydrate = source.indexOf('visualThemeStore.hydrate(', applyStart)

    expect(applyStart).toBeGreaterThan(-1)
    expect(fontFetch).toBeGreaterThan(applyStart)
    expect(generationGuard).toBeGreaterThan(fontFetch)
    expect(hydrate).toBeGreaterThan(generationGuard)
  })

  it('passes undefined through hydrate so loading a legacy design clears prior themes', () => {
    expect(source).toContain('visualThemeStore.hydrate(')
    expect(source).not.toContain('if (loadConfig.visualThemes) visualThemeStore.hydrate')
  })

  it('loads elements through ElementManager so explicit color bindings survive renderer snapshots', () => {
    const loadStart = source.indexOf('const loadElements = async')
    const loadEnd = source.indexOf('\\n}', loadStart)
    const loadSource = source.slice(loadStart, loadEnd)

    expect(source).toContain("import { addElement, syncElementInstancesFromCanvas } from '@/engine/managers/elementManager'")
    expect(loadSource).toContain('await addElement(element.eleType as any, config as any)')
    expect(loadSource).not.toContain('handler.add')
  })

  it('uses the blank-property reset when a design has no element config', () => {
    const configStart = source.indexOf('const applyRuntimeDesignConfig = async')
    const elementsCheck = source.indexOf('if (Array.isArray(config.elements))', configStart)
    const blankStart = source.indexOf('} else {', elementsCheck)
    const blankEnd = source.indexOf('return true', blankStart)
    const blankSource = source.slice(blankStart, blankEnd)

    expect(blankSource).toContain('propertiesStore.clearProperties()')
    expect(blankSource).not.toContain('propertiesStore.textCase = 0')
  })
})
