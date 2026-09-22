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

vi.mock('@/utils/errorMessage', () => ({ showErrorOnce: vi.fn() }))

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

it('blocks editor actions and reports cloud font progress until loading fails', async () => {
  setActivePinia(createPinia())
  const { useWrtImportProgressStore } = await import('@/stores/wrtImportProgress')
  const { restoreDesignAssetBundle } = await import('@/engine/services/designAssetBundleService')
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  let started!: () => void
  const reached = new Promise<void>(resolve => { started = resolve })
  getDesignByUid.mockResolvedValue({ data: { name: 'Tactical Casio', configJson: {}, assetBundleUrl: 'https://cdn/project.wrt' } })
  vi.mocked(restoreDesignAssetBundle).mockImplementationOnce(async (_config, options) => {
    options.onProgress?.({ stage: 'fonts', percentage: 60, fontSlug: 'wristo-icon', fontSize: 72 })
    started()
    await pending
    throw new Error('fixture load failure')
  })
  const loader = useDesignLoader({ canvasRef: { value: null } as any, waitCanvasReady: vi.fn(), translate: key => key, redirectToDesigns: vi.fn() })
  const loading = loader.loadDesign('cloud')
  await reached
  const progress = useWrtImportProgressStore()
  expect(progress.active).toBe(true)
  expect(progress.fileName).toBe('Tactical Casio')
  expect(progress.progress).toMatchObject({ stage: 'fonts', percentage: 54, fontSlug: 'wristo-icon' })
  expect(useBaseStore().designLoading).toBe(true)
  release()
  await loading
  expect(progress.active).toBe(false)
  expect(useBaseStore().designLoading).toBe(false)
})
