import { describe, expect, it } from 'vitest'
import groupSettingsSource from '@/components/panels/settings/GroupSettings.vue?raw'
import moonRendererSource from './moon.renderer.ts?raw'
import { encodeMoon } from './moon.encoder'

describe('moon image sizing', () => {
  it('persists the rendered image size after corner dragging', () => {
    const encoded = encodeMoon({
      id: 'moon-1',
      left: 120,
      top: 160,
      width: 42,
      height: 42,
      scaleX: 1.5,
      scaleY: 1.5,
      moonImageUrl: 'https://cdn.wristo.io/moonphase/h-phase-16.png',
    } as any)

    expect(encoded.width).toBe(63)
    expect(encoded.height).toBe(63)
  })

  it('does not use icon font size as an image-size fallback', () => {
    expect(moonRendererSource).not.toContain('config.fontSize')
  })

  it('uses four corner controls for direct resizing', () => {
    expect(moonRendererSource).toMatch(/designerControlMode\s*(?::|=)\s*'corner4'/)
  })

  it('does not expose group font controls for moon images', () => {
    expect(groupSettingsSource).toContain('showTypographyControls')
    expect(groupSettingsSource).toMatch(/eleType\s*!==\s*['"]moon['"]/)
  })
})
