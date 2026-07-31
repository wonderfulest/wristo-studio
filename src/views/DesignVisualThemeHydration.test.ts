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
