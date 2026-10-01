import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./design/useDesignLoader.ts', import.meta.url), 'utf8')

describe('Design visual theme hydration ordering', () => {

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

})
