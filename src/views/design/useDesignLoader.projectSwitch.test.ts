import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => {}, removeItem: () => {} } })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: globalThis.localStorage })
})
const { getDesignByUid } = vi.hoisted(() => ({ getDesignByUid: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignByUid } }))
vi.mock('@/engine/services/designAssetBundleService', () => ({
  restoreDesignAssetBundle: vi.fn(async (config: unknown) => config), clearRestoredDesignAssetUrls: vi.fn(), readWrtDesignPackage: vi.fn(), WrtDesignPackageError: class extends Error {},
}))
vi.mock('@/engine/managers/elementManager', () => ({ addElement: vi.fn(), syncElementInstancesFromCanvas: vi.fn() }))
vi.mock('@/engine/managers/layerManager', () => ({ syncLayersFromCanvas: vi.fn(), applyOrder: vi.fn() }))
vi.mock('@/engine/layout/studioLayoutController', () => ({ clearLayoutGroupProjections: vi.fn(), reflowAllLayoutGroups: vi.fn() }))
vi.mock('@/utils/errorMessage', () => ({ showErrorOnce: vi.fn() }))
import { useBaseStore } from '@/stores/baseStore'
import { useHistoryStore } from '@/stores/historyStore'
import { usePropertiesStore } from '@/stores/properties'
import { packageFonts, packageArchiveExtras } from '@/engine/services/packageAssetRegistry'
import { useDesignLoader } from './useDesignLoader'

describe('switching to a different cloud project', () => {
  beforeEach(() => { setActivePinia(createPinia()); getDesignByUid.mockReset() })
  it('removes the previous design and its background and assets before loading an empty project', async () => {
    const global = { id: 'global', eleType: 'global' }
    const objects = [global, { id: 'old-background', eleType: 'background' }, { id: 'old-text', eleType: 'text' }]
    const canvas = {
      getObjects: () => [...objects], discardActiveObject: vi.fn(),
      remove: (object: typeof objects[number]) => { objects.splice(objects.indexOf(object), 1) },
      requestRenderAll: vi.fn(),
    }
    useBaseStore().canvas = canvas as any
    const defaultTextCase = usePropertiesStore().textCase
    usePropertiesStore().textCase = 2
    packageFonts.set('old-font', { slug: 'old-font' } as any)
    packageArchiveExtras.files.set('old-preview.png', new Blob(['old']))
    packageArchiveExtras.productImages = [{ imageId: 1 } as any]
    const initial = vi.spyOn(useHistoryStore(), 'saveInitial').mockImplementation(() => {})
    getDesignByUid.mockResolvedValue({ code: 0, data: { name: 'Untitled', configJson: {} } })
    const onLoaded = vi.fn()
    const loader = useDesignLoader({ canvasRef: { value: null } as any, waitCanvasReady: async () => {}, translate: key => key, redirectToDesigns: vi.fn(), onDesignLoaded: onLoaded })
    await loader.loadDesign('new-project')
    expect(objects).toEqual([global])
    expect(packageFonts.size).toBe(0)
    expect(packageArchiveExtras.files.size).toBe(0)
    expect(packageArchiveExtras.productImages).toEqual([])
    expect(usePropertiesStore().textCase).toBe(defaultTextCase)
    expect(initial).toHaveBeenCalledOnce()
    expect(onLoaded).toHaveBeenCalledWith('new-project')
  })
})
