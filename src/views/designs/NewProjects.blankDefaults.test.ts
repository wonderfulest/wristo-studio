import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./NewProjects.vue', import.meta.url), 'utf8')

describe('NewProjects blank property defaults', () => {
  it('clears properties only after blank creation succeeds', () => {
    const sampleStart = source.indexOf('if (currentTemplate.value)')
    const blankStart = source.indexOf('// 情况二：未选择 Sample')
    const clearCall = source.indexOf('propertiesStore.clearProperties()', blankStart)
    const navigate = source.indexOf("router.push('/design?id=' + newDesign.designUid)", blankStart)

    expect(sampleStart).toBeGreaterThan(-1)
    expect(blankStart).toBeGreaterThan(sampleStart)
    expect(source.slice(sampleStart, blankStart)).not.toContain('clearProperties()')
    expect(clearCall).toBeGreaterThan(blankStart)
    expect(clearCall).toBeLessThan(navigate)
  })
})
