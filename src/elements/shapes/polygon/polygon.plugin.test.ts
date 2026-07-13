import { describe, expect, it, vi } from 'vitest'

const { registerElement, registerSettings } = vi.hoisted(() => ({ registerElement: vi.fn(), registerSettings: vi.fn() }))
vi.mock('@/engine/registry/elementRegistry', () => ({ registerElement }))
vi.mock('@/engine/registry/settingsRegistry', () => ({ registerSettings }))
vi.mock('./polygon.renderer', () => ({ createPolygon: vi.fn(), updatePolygon: vi.fn() }))
vi.mock('./polygon.encoder', () => ({ encodePolygon: vi.fn(), decodePolygon: vi.fn() }))
vi.mock('./polygon.panel.vue', () => ({ default: { name: 'PolygonPanel' } }))

import registerPolygonPlugin from './polygon.plugin'

describe('polygon plugin', () => {
  it('registers polygon element and settings capabilities', () => {
    registerPolygonPlugin()
    expect(registerElement).toHaveBeenCalledWith('polygon', expect.objectContaining({ add: expect.any(Function), update: expect.any(Function), encode: expect.any(Function), decode: expect.any(Function) }))
    expect(registerSettings).toHaveBeenCalledWith('polygon', expect.anything())
  })
})
