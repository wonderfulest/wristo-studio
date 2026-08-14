import { describe, expect, it, vi } from 'vitest'
import { createEditorRuntimeInitializer } from './editorRuntime'

describe('editor runtime initialization', () => {
  it('shares one initialization across concurrent and repeated calls', async () => {
    const loadStyles = vi.fn(async () => undefined)
    const registerPlugins = vi.fn()
    const loadPluginModule = vi.fn(async () => ({ loadPlugins: registerPlugins }))
    const initialize = createEditorRuntimeInitializer({ loadStyles, loadPluginModule })

    await Promise.all([initialize(), initialize()])
    await initialize()

    expect(loadStyles).toHaveBeenCalledTimes(1)
    expect(loadPluginModule).toHaveBeenCalledTimes(1)
    expect(registerPlugins).toHaveBeenCalledTimes(1)
  })

  it('allows a retry after initialization fails', async () => {
    const loadStyles = vi.fn()
      .mockRejectedValueOnce(new Error('style load failed'))
      .mockResolvedValueOnce(undefined)
    const registerPlugins = vi.fn()
    const initialize = createEditorRuntimeInitializer({
      loadStyles,
      loadPluginModule: async () => ({ loadPlugins: registerPlugins }),
    })

    await expect(initialize()).rejects.toThrow('style load failed')
    await expect(initialize()).resolves.toBeUndefined()

    expect(loadStyles).toHaveBeenCalledTimes(2)
    expect(registerPlugins).toHaveBeenCalledTimes(1)
  })
})
