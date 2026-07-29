import { describe, expect, it } from 'vitest'
import { createVisualThemePreviewController } from './visualThemePreviewService'
import type { PropertiesMap } from '@/types/properties'
import type { VisualThemesConfig } from '@/types/visualTheme'

const properties: PropertiesMap = {
  Accent: { type: 'color', title: 'Accent', value: '0x111111', themeMode: 'theme' },
  UserColor: { type: 'color', title: 'User', value: '0x222222', themeMode: 'user' },
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
  it('switches theme presentation and restores base without mutating persisted snapshots or defaults', async () => {
    const canvasElements = structuredClone(baseElements)
    const persisted: Array<Record<string, any>> = structuredClone(baseElements)
    const controller = createVisualThemePreviewController({
      getBaseElements: () => persisted,
      getCanvasElements: () => canvasElements,
      applyElement: async (element, patch) => {
        Object.assign(element, patch)
      },
      restorePersistedElement: (config) => {
        const index = persisted.findIndex((item) => item.id === config.id)
        persisted[index] = structuredClone(config)
      },
      requestRender: () => undefined,
    })

    await controller.preview(visualThemes, 'night', properties)
    expect(canvasElements[0]).toMatchObject({ assetId: 20, imageUrl: 'night.svg' })
    expect(canvasElements[1]).toMatchObject({ color: '0xBBBBBB', bgColor: '0x222222' })
    expect(persisted).toEqual(baseElements)
    expect(properties.Accent.value).toBe('0x111111')

    await controller.restore()
    expect(canvasElements).toEqual(baseElements)
    expect(persisted).toEqual(baseElements)
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
      restorePersistedElement: () => undefined,
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
    expect(canvasElements[1].color).toBe('0xBBBBBB')
  })
})
