// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'
import { useFontStore } from '@/stores/fontStore'
import { createAngledText, updateAngledText } from './angledText/angledText.renderer'
import { createRadialText, updateRadialText } from './radialText/radialText.renderer'
import { encodeRadialText } from './radialText/radialText.encoder'
import { createScrollableText, pauseScrollableAnimation, updateScrollableText } from './scrollableText/scrollableText.renderer'
import { createText } from './text/text.renderer'
import { encodeText } from './text/text.encoder'

const recipe = {
  schemaVersion: 1 as const,
  rendererVersion: '1' as const,
  fontWeight: 700,
  italicAngle: -12,
  outlineWidthEm: 0.04,
  outlineMode: 'outline-only' as const,
  lineJoin: 'round' as const,
  antialias: true as const
}

const fakeText = (extra: Record<string, unknown> = {}) =>
  ({
    id: 'text-1',
    fontFamily: 'plain',
    fontSize: 40,
    fill: '#07c',
    fontWeight: 400,
    skewX: 0,
    stroke: undefined,
    strokeWidth: 0,
    setCoords: vi.fn(),
    set(key: string | Record<string, unknown>, value?: unknown) {
      if (typeof key === 'string') (this as any)[key] = value
      else Object.assign(this, key)
    },
    ...extra
  }) as any

describe('text renderer bitmap recipe preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useFontStore().serverFonts.set('outline-clock', { slug: 'outline-clock', bitmapRecipe: recipe } as any)
  })

  it('reapplies recipe on angled text font, size and fill updates', () => {
    const element = fakeText({ canvas: { renderAll: vi.fn() } })
    updateAngledText(element, { fontFamily: 'outline-clock', fontSize: 50, fill: '#fa2' })
    expect(element).toMatchObject({ fontFamily: 'outline-clock', fontSize: 50, fill: 'rgba(0,0,0,0)', stroke: '#fa2', strokeWidth: 2 })
  })

  it('reapplies recipe to radial group children on update', () => {
    const child = fakeText()
    const element = fakeText({ _objects: [child], updateRadialLayout: vi.fn(), canvas: { renderAll: vi.fn() } })
    updateRadialText(element, { fontFamily: 'outline-clock', fontSize: 25, fill: '#fb0' })
    expect(child).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#fb0', strokeWidth: 1 })
  })

  it('reapplies recipe on scrollable text updates', () => {
    const element = fakeText()
    const renderAll = vi.fn()
    ;(useCanvasStore() as any).canvas = { renderAll }
    updateScrollableText(element, { fontFamily: 'outline-clock', fontSize: 75, fill: '#0cf' })
    expect(element).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#0cf', strokeWidth: 3 })
    expect(renderAll).toHaveBeenCalledOnce()
  })

  it.each([
    ['angled', createAngledText],
    ['radial', createRadialText],
    ['scrollable', createScrollableText]
  ] as const)('applies recipe when creating %s text', (_name, create) => {
    const objects: any[] = []
    ;(useCanvasStore() as any).canvas = {
      add: (object: any) => objects.push(object),
      renderAll: vi.fn(),
      requestRenderAll: vi.fn(),
      setActiveObject: vi.fn(),
      getWidth: () => 454
    }
    const element: any = create({
      id: `create-${_name}`,
      eleType: `${_name}Text`,
      left: 100,
      top: 100,
      fontFamily: 'outline-clock',
      fontSize: 50,
      fill: '#0fc',
      textTemplate: '12:48'
    } as any)
    const visual = _name === 'radial' ? element._objects[0] : element
    expect(visual).toMatchObject({ fill: 'rgba(0,0,0,0)', stroke: '#0fc', strokeWidth: 2 })
    expect(objects).toContain(element)
    if (_name === 'scrollable') pauseScrollableAnimation(element)
  })

  it('keeps the original fill when encoding a newly created recipe text', () => {
    ;(useCanvasStore() as any).canvas = {
      add: vi.fn(),
      renderAll: vi.fn(),
      setActiveObject: vi.fn()
    }
    const element = createText({
      id: 'create-text',
      eleType: 'text',
      left: 100,
      top: 100,
      fontFamily: 'outline-clock',
      fontSize: 50,
      fill: '#0fc',
      textTemplate: '12:48'
    } as any)
    expect(encodeText(element).fill).toBe('#0fc')
  })

  it('keeps the configured fill when encoding a newly created radial recipe text', () => {
    ;(useCanvasStore() as any).canvas = {
      add: vi.fn(),
      renderAll: vi.fn(),
      setActiveObject: vi.fn()
    }
    const element = createRadialText({
      id: 'create-radial-persist',
      eleType: 'radialText',
      left: 100,
      top: 100,
      fontFamily: 'outline-clock',
      fontSize: 50,
      fill: '#0fc',
      textTemplate: '12:48'
    } as any)
    expect(encodeRadialText(element).fill).toBe('#0fc')
  })
})
