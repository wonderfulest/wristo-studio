import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

const angleFields = [
  ['src/elements/goal/goalArc/goalArc.panel.vue', 2],
  ['src/elements/sunEvents/arcSunEvents/arcSunEvents.panel.vue', 1],
  ['src/elements/sunEvents/lineSunEvents/lineSunEvents.panel.vue', 1],
  ['src/elements/texts/radialText/radialText.panel.vue', 1],
  ['src/elements/texts/angledText/angledText.panel.vue', 1],
] as const

describe('absolute angle field help', () => {
  it.each(angleFields)('uses the shared clock-position guide in %s', (relativePath, expectedCount) => {
    const source = readFileSync(`${root}/${relativePath}`, 'utf8')
    const renderedLabels = source.match(/<AngleHelpLabel\b/g) ?? []

    expect(renderedLabels).toHaveLength(expectedCount)
    expect(source).toContain("import AngleHelpLabel from '@/elements/common/settings/AngleHelpLabel.vue'")
  })

  it('does not attach clock-position help to angle ranges', () => {
    const arcSource = readFileSync(`${root}/src/elements/sunEvents/arcSunEvents/arcSunEvents.panel.vue`, 'utf8')

    expect(arcSource).not.toMatch(/AngleHelpLabel[^>]+angleRange/)
  })

  it('uses the shared clock-position guide for Curve Sun Events', () => {
    const relativePath = 'src/elements/sunEvents/curveSunEvents/curveSunEvents.panel.vue'
    expect(existsSync(`${root}/${relativePath}`)).toBe(true)
    const source = readFileSync(`${root}/${relativePath}`, 'utf8')
    expect(source.match(/<AngleHelpLabel\b/g) ?? []).toHaveLength(1)
    expect(source).toContain("import AngleHelpLabel from '@/elements/common/settings/AngleHelpLabel.vue'")
  })
})
