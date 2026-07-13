// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getActiveSubDialLayoutEditor, installSubDialLayoutEditor } from './subDial.plugin'

const canvas = (throwOnOff = false) => {
  let thrown = false
  return {
    on: vi.fn(),
    off: vi.fn(() => {
      if (throwOnOff && !thrown) {
        thrown = true
        throw new Error('off failed')
      }
    }),
    getObjects: () => []
  }
}

const options = (target: ReturnType<typeof canvas>) => ({
  canvas: target as any,
  updateElement: vi.fn(),
  saveHistory: vi.fn(),
  document: null
})

describe('sub-dial layout editor plugin ownership', () => {
  afterEach(() => getActiveSubDialLayoutEditor()?.dispose())

  it('returns the new editor when replacing an owner whose dispose throws', () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const first = installSubDialLayoutEditor(options(canvas(true)))
    const second = installSubDialLayoutEditor(options(canvas()))

    expect(second).not.toBe(first)
    expect(getActiveSubDialLayoutEditor()).toBe(second)
    expect(report).toHaveBeenCalledOnce()

    expect(() => second.dispose()).not.toThrow()
    expect(getActiveSubDialLayoutEditor()).toBeNull()
    report.mockRestore()
  })
})
