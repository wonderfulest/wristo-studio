// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHistoryStore } from './historyStore'
import { usePropertiesStore } from './properties'
import { useElementDataStore } from './elementDataStore'
import { useLayoutGroupStore } from './layoutGroupStore'

const createCanvas = () => {
  let version = 0
  return {
    setVersion(nextVersion: number) {
      version = nextVersion
    },
    toJSON: () => ({
      objects: [{ id: `element-${version}`, eleType: 'data' }],
    }),
    getObjects: () => [],
    getActiveObjects: () => [],
    set: () => undefined,
    requestRenderAll: () => undefined,
    on: () => undefined,
    off: () => undefined,
  }
}

const baseStore = {
  canvas: null,
  generateConfig: () => ({ designId: 'design-a' }),
}

describe('history saveState result', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns false without an attached canvas', () => {
    expect(useHistoryStore().saveState('missing-canvas')).toBe(false)
  })

  it('returns true only for a new snapshot and false for a duplicate', () => {
    const canvas = createCanvas()
    const historyStore = useHistoryStore()
    historyStore.attachCanvas(canvas as any, baseStore as any)
    historyStore.saveInitial()

    canvas.setVersion(1)
    expect(historyStore.saveState('changed')).toBe(true)
    expect(historyStore.saveState('duplicate')).toBe(false)
  })

  it('returns false while recording is suspended or snapshot capture fails', async () => {
    const canvas = createCanvas()
    const historyStore = useHistoryStore()
    historyStore.attachCanvas(canvas as any, baseStore as any)
    historyStore.saveInitial()
    canvas.setVersion(1)

    await expect(
      historyStore.runWithoutRecording(() => historyStore.saveState('suspended')),
    ).resolves.toBe(false)

    historyStore.attachCanvas(
      {
        ...canvas,
        toJSON: () => {
          throw new Error('snapshot failed')
        },
      } as any,
      baseStore as any,
    )
    expect(historyStore.saveState('snapshot-failed')).toBe(false)
  })

  it('returns true when coalescing a config-only change', () => {
    const canvas = createCanvas()
    const historyStore = useHistoryStore()
    historyStore.attachCanvas(canvas as any, baseStore as any)
    historyStore.saveInitial()

    usePropertiesStore().addProperty({
      key: 'chart_1',
      type: 'chart',
      title: 'Chart 1',
      options: [],
    })

    expect(
      historyStore.saveState('coalesced', { coalesceIfSameFabric: true }),
    ).toBe(true)
  })

  it('captures top-level data options as property history state', () => {
    const canvas = createCanvas()
    const historyStore = useHistoryStore()
    historyStore.attachCanvas(canvas as any, baseStore as any)
    historyStore.saveInitial()

    usePropertiesStore().dataOptions = {
      ':FIELD_TYPE_STEPS': { metricSymbol: ':FIELD_TYPE_STEPS' } as any,
    }

    expect(historyStore.saveState('data-options', { coalesceIfSameFabric: true })).toBe(true)
  })

  it('keeps the selected font slug when a modified object renders the Chinese preview fallback', () => {
    const handlers = new Map<string, (event?: any) => void>()
    const canvas = {
      ...createCanvas(),
      on: (name: string, handler: (event?: any) => void) => handlers.set(name, handler),
      off: (name: string) => handlers.delete(name),
    }
    const elementDataStore = useElementDataStore()
    elementDataStore.upsertElement({
      id: 'date-1', eleType: 'date', left: 10, top: 20,
      fontFamily: 'old-font', fontSize: 24,
    } as any)
    const historyStore = useHistoryStore()
    historyStore.attachCanvas(canvas as any, baseStore as any)
    historyStore.registerCanvasEvents()

    handlers.get('object:modified')?.({
      target: {
        id: 'date-1', eleType: 'date', left: 10, top: 20,
        fontFamily: 'noto-sans-sc-regular', assetFontFamily: 'new-chinese-bitmap-font', fontSize: 24,
      },
    })

    expect(elementDataStore.getElementConfig('date-1')?.fontFamily).toBe('new-chinese-bitmap-font')
    historyStore.dispose()
  })

  it('exposes restore activity and rejects saves while a restore overlaps', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let releaseRestore!: () => void
    const restoreGate = new Promise<void>((resolve) => {
      releaseRestore = resolve
    })
    const canvas = {
      ...createCanvas(),
      loadFromJSON: async () => {
        await restoreGate
        throw new Error('stop after overlap assertion')
      },
    }
    try {
      const historyStore = useHistoryStore()
      historyStore.attachCanvas(canvas as any, baseStore as any)
      historyStore.saveInitial()
      canvas.setVersion(1)
      expect(historyStore.saveState('changed')).toBe(true)

      const undo = historyStore.undo()
      expect(historyStore.isRestoring).toBe(true)
      expect(historyStore.saveState('overlap')).toBe(false)
      releaseRestore()
      await undo
      expect(historyStore.isRestoring).toBe(false)
    } finally {
      warn.mockRestore()
    }
  })

  it('restores the pre-mutation snapshot when an atomic mutation fails', async () => {
    const canvas = createCanvas()
    const loadFromJSON = vi.fn(async (json: string) => {
      const parsed = JSON.parse(json)
      const id = String(parsed.objects?.[0]?.id ?? '')
      canvas.setVersion(Number(id.replace('element-', '')) || 0)
    })
    const historyStore = useHistoryStore()
    historyStore.attachCanvas({ ...canvas, loadFromJSON } as any, baseStore as any)
    historyStore.saveInitial()

    await expect(historyStore.runAtomicMutation('time-hands:add', async () => {
      canvas.setVersion(1)
      throw new Error('minute hand failed')
    })).rejects.toThrow('minute hand failed')

    expect(loadFromJSON).toHaveBeenCalledTimes(1)
    expect(JSON.parse(loadFromJSON.mock.calls[0][0]).objects[0].id).toBe('element-0')
  })

  it('restores layout group relationships through undo and redo', async () => {
    const canvas = createCanvas()
    const historyStore = useHistoryStore()
    historyStore.attachCanvas({
      ...canvas,
      loadFromJSON: async () => undefined,
    } as any, baseStore as any)
    const elementDataStore = useElementDataStore()
    elementDataStore.upsertElement({ id: 'data-1', eleType: 'data', left: 10, top: 20 } as any)
    elementDataStore.upsertElement({ id: 'unit-1', eleType: 'unit', left: 30, top: 20 } as any)
    const layoutStore = useLayoutGroupStore()
    layoutStore.createGroup({
      id: 'row-1', name: 'Row', direction: 'horizontal', left: 20, top: 20, originX: 'left',
      members: [
        { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
        { elementId: 'unit-1', gapBefore: 1, offsetY: 0 },
      ],
    })
    historyStore.saveInitial()

    layoutStore.reorderMembers('row-1', ['unit-1', 'data-1'])
    expect(historyStore.saveState('layout-group:reorder')).toBe(true)
    await historyStore.undo()
    expect(layoutStore.groups[0].members.map((member) => member.elementId)).toEqual(['data-1', 'unit-1'])

    await historyStore.redo()
    expect(layoutStore.groups[0].members.map((member) => member.elementId)).toEqual(['unit-1', 'data-1'])
  })
})
