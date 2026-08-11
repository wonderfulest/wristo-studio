import { describe, expect, it, vi } from 'vitest'

const { registerElement, registerSettings } = vi.hoisted(() => ({ registerElement: vi.fn(), registerSettings: vi.fn() }))
vi.mock('@/engine/registry/elementRegistry', () => ({ registerElement }))
vi.mock('@/engine/registry/settingsRegistry', () => ({ registerSettings }))
vi.mock('./triangle.renderer', () => ({ createTriangle: vi.fn(), updateTriangle: vi.fn() }))
vi.mock('./triangle.encoder', () => ({ encodeTriangle: vi.fn(), decodeTriangle: vi.fn() }))
vi.mock('./triangle.panel.vue', () => ({ default: { name: 'TrianglePanel' } }))

import registerTrianglePlugin from './triangle.plugin'

describe('triangle plugin', () => {
  it('registers triangle element and settings capabilities', () => {
    registerTrianglePlugin()
    expect(registerElement).toHaveBeenCalledWith('triangle', expect.objectContaining({
      add: expect.any(Function),
      update: expect.any(Function),
      encode: expect.any(Function),
      decode: expect.any(Function),
    }))
    expect(registerSettings).toHaveBeenCalledWith('triangle', expect.anything())
  })
})
