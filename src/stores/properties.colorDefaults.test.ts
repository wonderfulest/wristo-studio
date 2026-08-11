import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('color property system defaults', () => {
  it('contains the eight common colors', () => {
    const source = readFileSync(new URL('./properties.ts', import.meta.url), 'utf8')
    const defaults = source.match(/defaultColorOptions:\s*\[([\s\S]*?)\]\s+as PropertyOption\[\]/)?.[1] || ''

    expect(defaults.match(/\{ label:/g)).toHaveLength(8)
    expect(defaults).toContain("{ label: 'White', value: '0xFFFFFF' }")
    expect(defaults).toContain("{ label: 'Black', value: '0x000000' }")
    expect(defaults).toContain("{ label: 'Red', value: '0xFF0000' }")
    expect(defaults).toContain("{ label: 'Green', value: '0x00FF00' }")
    expect(defaults).toContain("{ label: 'Blue', value: '0x0000FF' }")
    expect(defaults).toContain("{ label: 'Yellow', value: '0xFFFF00' }")
    expect(defaults).toContain("{ label: 'Orange', value: '0xFFAA00' }")
    expect(defaults).toContain("{ label: 'Purple', value: '0x5500AA' }")
  })
})
