// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { reflowAllLayoutGroups } = vi.hoisted(() => ({ reflowAllLayoutGroups: vi.fn() }))
vi.mock('@/engine/layout/studioLayoutController', () => ({ reflowAllLayoutGroups }))

import { useLayerStore } from './layerStore'

describe('layerStore layout group refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('reflows groups after switching Active/Ambient preview mode', () => {
    useLayerStore().setPreviewMode('ambient')

    expect(reflowAllLayoutGroups).toHaveBeenCalledOnce()
  })
})
