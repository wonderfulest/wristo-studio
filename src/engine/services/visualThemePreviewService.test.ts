import { describe, expect, it, vi } from 'vitest'
import { createVisualThemePreviewController } from './visualThemePreviewService'
import type { PropertiesMap } from '@/types/properties'
import type { VisualThemesConfig } from '@/types/visualTheme'

const properties: PropertiesMap = {
  Accent: { type: 'color', title: 'Accent', value: '0x111111', themeMode: 'theme' },
  UserColor: { type: 'color', title: 'User', value: '0x222222', themeMode: 'user' },
}

const propertiesWithoutMode: PropertiesMap = {
  Accent: { type: 'color', title: 'Accent', value: '0x111111' },
}

const visualThemes: VisualThemesConfig = {
  version: 1,
  enabled: true,
  defaultThemeId: 'day',
  selectionMode: 'user',
  themes: [
    {
      id: 'day',
      name: 'Day',
      assets: { hourHand: { assetId: 10, imageUrl: 'day.svg' } },
      colors: { Accent: '0xAAAAAA' },
      fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
    },
    {
      id: 'night',
      name: 'Night',
      assets: { hourHand: { assetId: 20, imageUrl: 'night.svg' } },
      colors: { Accent: '0xBBBBBB' },
      fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
    },
  ],
}

const baseElements = [
  { id: 'hour', eleType: 'hourHand', assetId: 1, imageUrl: 'base.svg' },
  {
    id: 'label',
    eleType: 'text',
    color: '0x111111',
    colorProperty: 'Accent',
    bgColor: '0x222222',
    bgColorProperty: 'UserColor',
  },
]

describe('visualThemePreviewService', () => {
  it('applies an explicitly bound theme color without themeMode', async () => {
    const persisted = [{ id: 'label', eleType: 'text', fill: '#111111', fillProperty: 'Accent' }]
    const canvasElements = structuredClone(persisted)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })

    await controller.preview(visualThemes, 'night', propertiesWithoutMode)

    expect(canvasElements[0].fill).toBe('#BBBBBB')
  })

  it('switches theme presentation and restores base without mutating persisted snapshots or defaults', async () => {
    const canvasElements = structuredClone(baseElements)
    const persisted: Array<Record<string, any>> = structuredClone(baseElements)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })

    await controller.preview(visualThemes, 'night', properties)
    expect(canvasElements[0]).toMatchObject({ assetId: 20, imageUrl: 'night.svg' })
    expect(canvasElements[1]).toMatchObject({ color: '#BBBBBB', bgColor: '0x222222' })
    expect(persisted).toEqual(baseElements)
    expect(properties.Accent.value).toBe('0x111111')

    await controller.restore()
    expect(canvasElements).toEqual(baseElements)
    expect(persisted).toEqual(baseElements)
  })

  it('uses the live canvas color binding when the persisted snapshot has not captured it yet', async () => {
    const config = structuredClone(visualThemes)
    const persisted = [{
      id: 'label',
      eleType: 'text',
      fill: '0x111111',
    }]
    const canvasElements = [{
      ...persisted[0],
      fillProperty: 'Accent',
    }]
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })

    await controller.preview(config, 'night', properties)

    expect(canvasElements[0].fill).toBe('#BBBBBB')
    expect(persisted[0].fill).toBe('0x111111')

    config.themes[1].colors.Accent = '0x00FF00'
    await controller.preview(config, 'night', properties)

    expect(canvasElements[0].fill).toBe('#00FF00')
    expect(persisted[0].fill).toBe('0x111111')
  })

  it('does not infer a color binding from an equal base color', async () => {
    const persisted = [{
      id: 'metric',
      eleType: 'data',
      fill: '#111111',
    }]
    const canvasElements = structuredClone(persisted)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })

    await controller.preview(visualThemes, 'night', properties)

    expect(canvasElements[0].fill).toBe('#111111')
    expect(persisted[0].fill).toBe('#111111')
  })

  it('applies a theme background to the existing background element', async () => {
    const persisted = [{
      id: 'background-1',
      eleType: 'background',
      imageId: 1,
      assetId: 1,
      imageUrl: 'https://cdn.example/base.png',
    }]
    const canvasElements = structuredClone(persisted)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })
    const config = structuredClone(visualThemes)
    config.themes[1].assets.background = {
      assetId: 2,
      imageUrl: 'https://cdn.example/night.png',
    }

    await controller.preview(config, 'night', properties)

    expect(canvasElements).toHaveLength(1)
    expect(canvasElements[0]).toMatchObject({
      id: 'background-1',
      imageId: null,
      assetId: 2,
      imageUrl: 'https://cdn.example/night.png',
    })
  })

  it('clears a theme background through the existing background element', async () => {
    const persisted = [{
      id: 'background-1',
      eleType: 'background',
      imageId: 1,
      assetId: 1,
      imageUrl: 'https://cdn.example/base.png',
    }]
    const canvasElements = structuredClone(persisted)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })
    const config = structuredClone(visualThemes)
    config.themes[1].assets.background = { assetId: null, imageUrl: null }

    await controller.preview(config, 'night', properties)

    expect(canvasElements).toHaveLength(1)
    expect(canvasElements[0]).toMatchObject({
      id: 'background-1',
      imageId: null,
      assetId: null,
      imageUrl: null,
    })
  })

  it('serializes async theme switches so a stale asset load cannot win', async () => {
    const canvasElements = structuredClone(baseElements)
    const resolvers: Array<() => void> = []
    const controller = createVisualThemePreviewController({
      getBaseElements: () => baseElements,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        if (element.eleType === 'hourHand') {
          await new Promise<void>((resolve) => resolvers.push(resolve))
        }
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })

    const day = controller.preview(visualThemes, 'day', properties)
    await Promise.resolve()
    const night = controller.preview(visualThemes, 'night', properties)
    resolvers.shift()?.()
    while (!resolvers.length) await new Promise((resolve) => setTimeout(resolve, 0))
    resolvers.shift()?.()
    await Promise.all([day, night])

    expect(canvasElements[0]).toMatchObject({ assetId: 20, imageUrl: 'night.svg' })
    expect(canvasElements[1].color).toBe('#BBBBBB')
  })

  it('queues restore during a pending renderer and restores only the captured old canvas', async () => {
    const oldCanvas = structuredClone(baseElements)
    let activeCanvas = oldCanvas
    const persisted: Array<Record<string, any>> = structuredClone(baseElements)
    let release!: () => void
    let deferred = true
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => activeCanvas,
      applyElement: (element, patch, context) => {
        expect(context).toEqual({ persist: false })
        if (!deferred) {
          Object.assign(element, patch)
          return Promise.resolve()
        }
        deferred = false
        return new Promise<void>((resolve) => {
          release = () => {
            Object.assign(element, patch)
            resolve()
          }
        })
      },
      requestRender: () => undefined,
    })

    const pending = controller.preview(visualThemes, 'night', properties)
    await Promise.resolve()
    const restoring = controller.restore()
    const newCanvas = structuredClone(baseElements)
    activeCanvas = newCanvas
    release()
    await Promise.all([pending, restoring])

    expect(oldCanvas).toEqual(baseElements)
    expect(newCanvas).toEqual(baseElements)
    expect(persisted).toEqual(baseElements)
  })

  it('refreshes the base from persisted elements before restore', async () => {
    const canvasElements = structuredClone(baseElements)
    const persisted: Array<Record<string, any>> = structuredClone(baseElements)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })

    await controller.preview(visualThemes, 'night', properties)
    persisted[1].color = '0x333333'
    await controller.restore()

    expect(canvasElements[1].color).toBe('0x333333')
  })

  it('contains renderer rejection, reports it, and can still restore the base', async () => {
    const canvasElements = structuredClone(baseElements)
    const onError = vi.fn()
    let rejectThemeAsset = true
    const controller = createVisualThemePreviewController({
      getBaseElements: () => baseElements,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        if (rejectThemeAsset && element.id === 'label') throw new Error('bad image')
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
      onError,
    })

    await expect(controller.preview(visualThemes, 'night', properties)).resolves.toBeUndefined()
    expect(canvasElements).toEqual(baseElements)
    expect(onError).toHaveBeenCalledTimes(1)

    rejectThemeAsset = false
    await controller.restore()
    expect(canvasElements).toEqual(baseElements)
  })

  it('passes explicit null asset references when restoring an empty base slot', async () => {
    const bases = [{ id: 'cap', eleType: 'centerCap', assetId: null, imageUrl: null }]
    const canvas = [{ id: 'cap', eleType: 'centerCap', assetId: 42, imageUrl: 'theme-cap.svg' }]
    const patches: Record<string, unknown>[] = []
    const controller = createVisualThemePreviewController({
      getBaseElements: () => bases,
      getCanvasElements: () => canvas,
      applyElement: async (element, patch) => {
        patches.push(patch)
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })

    await controller.preview({
      ...visualThemes,
      themes: [{ ...visualThemes.themes[0], assets: { centerCap: { assetId: 42, imageUrl: 'theme-cap.svg' } } }],
    }, 'day', properties)
    await controller.restore()

    expect(patches.at(-1)).toMatchObject({ assetId: null, imageUrl: null })
    expect(canvas[0]).toMatchObject({ assetId: null, imageUrl: null })
  })

  it('restores the old canvas snapshot during a design switch without touching the new canvas', async () => {
    const oldCanvas = structuredClone(baseElements)
    let activeCanvas = oldCanvas
    const controller = createVisualThemePreviewController({
      getBaseElements: () => baseElements,
      getCanvasElements: () => activeCanvas,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      requestRender: () => undefined,
    })
    await controller.preview(visualThemes, 'night', properties)
    const newCanvas = structuredClone(baseElements)

    const reset = controller.reset()
    activeCanvas = newCanvas
    await reset

    expect(oldCanvas).toEqual(baseElements)
    expect(newCanvas).toEqual(baseElements)
  })
})
