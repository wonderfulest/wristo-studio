import { readFileSync } from 'node:fs'
import opentype from 'opentype.js'
import { describe, expect, it } from 'vitest'

const fontPath = new URL('./wristo-icon.ttf', import.meta.url)

describe('bundled Wristo icon font', () => {
  it.each([
    ['004A', 'weekly run distance'],
    ['004B', 'weekly cycling distance'],
    ['004C', 'weekly swimming distance'],
    ['004D', 'weekly walking distance'],
  ])('contains a drawn glyph at U+%s for %s', (unicode) => {
    const codePoint = Number.parseInt(unicode, 16)
    const bytes = readFileSync(fontPath)
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const font = opentype.parse(buffer)
    const glyph = font.charToGlyph(String.fromCodePoint(codePoint))

    expect(glyph.index).not.toBe(0)
    expect(glyph.getPath().commands.length).toBeGreaterThan(0)
  })
})
