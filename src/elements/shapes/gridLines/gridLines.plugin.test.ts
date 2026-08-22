import { describe, expect, it, vi } from 'vitest'

const { registerElement, registerSettings } = vi.hoisted(() => ({
  registerElement: vi.fn(),
  registerSettings: vi.fn(),
}))

vi.mock('@/engine/registry/elementRegistry', () => ({ registerElement }))
vi.mock('@/engine/registry/settingsRegistry', () => ({ registerSettings }))
vi.mock('./gridLines.renderer', () => ({ createGridLines: vi.fn(), updateGridLines: vi.fn() }))
vi.mock('./gridLines.encoder', () => ({ encodeGridLines: vi.fn(), decodeGridLines: vi.fn() }))
vi.mock('./gridLines.panel.vue', () => ({ default: { name: 'GridLinesPanel' } }))

describe('Grid Lines plugin', () => {
  it('registers element lifecycle and settings capabilities', async () => {
    const plugin = await import(/* @vite-ignore */ './gridLines.plugin').catch(() => null)

    expect(plugin).not.toBeNull()
    plugin?.default()
    expect(registerElement).toHaveBeenCalledWith('gridLines', expect.objectContaining({
      add: expect.any(Function),
      update: expect.any(Function),
      encode: expect.any(Function),
      decode: expect.any(Function),
    }))
    expect(registerSettings).toHaveBeenCalledWith('gridLines', expect.anything())
  })
})
