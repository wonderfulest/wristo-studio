import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })
})

const { getDesignByUid } = vi.hoisted(() => ({ getDesignByUid: vi.fn() }))

vi.mock('@/api/wristo/design', () => ({
  designApi: { getDesignByUid },
}))

vi.mock('@/engine/services/designAssetBundleService', () => ({
  restoreDesignAssetBundle: vi.fn(async (config: unknown) => config),
  clearRestoredDesignAssetUrls: vi.fn(),
  readWrtDesignPackage: vi.fn(),
  WrtDesignPackageError: class extends Error {},
}))

import { useBaseStore } from '@/stores/baseStore'
import { useDesignStore } from '@/stores/designStore'
import { useFontStore } from '@/stores/fontStore'
import { useDesignLoader } from './useDesignLoader'

describe('useDesignLoader exclusion hydration races', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getDesignByUid.mockReset()
  })

  it('does not let a stale blank load clear exclusions from the current design', async () => {
    let releaseCanvasReady!: () => void
    const canvasReady = new Promise<void>((resolve) => {
      releaseCanvasReady = resolve
    })
    let waitStarted!: () => void
    const reachedWait = new Promise<void>((resolve) => {
      waitStarted = resolve
    })
    const waitCanvasReady = vi.fn(async () => {
      waitStarted()
      await canvasReady
    })
    getDesignByUid.mockResolvedValue({
      data: {
        name: 'Old blank design',
        configJson: {},
        product: null,
      },
    })

    const baseStore = useBaseStore()
    baseStore.canvas = { requestRenderAll: vi.fn() } as any
    vi.spyOn(useFontStore(), 'fetchFonts').mockResolvedValue(undefined as any)
    const designStore = useDesignStore()
    designStore.setConnectIqSettingsExcludedDataTypeValues([31])
    const setExclusions = vi.spyOn(designStore, 'setConnectIqSettingsExcludedDataTypeValues')
    const loader = useDesignLoader({
      canvasRef: { value: null } as any,
      waitCanvasReady,
      translate: (key) => key,
      redirectToDesigns: vi.fn(),
    })

    const staleLoad = loader.loadDesign('old')
    await reachedWait
    loader.dispose()
    expect(setExclusions).not.toHaveBeenCalled()
    designStore.setConnectIqSettingsExcludedDataTypeValues([2, 31])
    releaseCanvasReady()
    await staleLoad

    expect(designStore.connectIqSettingsExcludedDataTypeValues).toEqual([2, 31])
  })
})
