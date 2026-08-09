import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Editor Settings unit preview controls', () => {
  it('exposes independent distance and temperature device settings', () => {
    const source = readFileSync(new URL('./EditorSettingsDialog.vue', import.meta.url), 'utf8')
    expect(source).toContain('previewDevice.distanceUnits')
    expect(source).toContain('previewDevice.temperatureUnits')
    expect(source).toContain("@change=\"refreshMetricPreview\"")
  })
})
