// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHistoryStore } from './historyStore'
import { usePropertiesStore } from './properties'

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
})
