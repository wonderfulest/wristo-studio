import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('Garmin system font previews', () => {
  it('loads the bundled Noto Sans SC regular file as the Chinese preview font', () => {
    const stylesheetUrl = new URL('./garmin-system-fonts.css', import.meta.url)
    const stylesheet = readFileSync(stylesheetUrl, 'utf8')
    const fontUrl = new URL('../fonts/noto-sans-sc-regular.ttf', import.meta.url)

    expect(stylesheet).toContain("font-family: 'noto-sans-sc-regular'")
    expect(stylesheet).toContain("url('../fonts/noto-sans-sc-regular.ttf') format('truetype')")
    expect(stylesheet).not.toContain("@fontsource/noto-sans-sc")
    expect(existsSync(fileURLToPath(fontUrl))).toBe(true)
  })
})
