import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Rgb565ColorSpectrum contract', () => {
  const source = readFileSync(new URL('./Rgb565ColorSpectrum.vue', import.meta.url), 'utf8')

  it('supports pointer selection and capture', () => {
    expect(source).toContain('@pointerdown="startSpectrumDrag"')
    expect(source).toContain('@pointermove="moveSpectrumDrag"')
    expect(source).toContain('setPointerCapture')
    expect(source).toContain('normalizeRgb565Hex')
  })

  it('exposes keyboard-accessible sliders', () => {
    expect(source).toContain('role="slider"')
    expect(source).toContain(':aria-valuenow')
    expect(source).toContain('@keydown="handleSpectrumKeydown"')
    expect(source).toContain('@keydown="handleHueKeydown"')
  })

  it('emits only quantized colors', () => {
    expect(source).toContain("defineEmits<{ change: [value: string] }>()")
    expect(source).toContain("emit('change', quantizedColor.value)")
  })
})
