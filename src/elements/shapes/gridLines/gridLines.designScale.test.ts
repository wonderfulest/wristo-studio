import { describe, expect, it, vi } from 'vitest'
import { scaleElementConfig, scaleFabricCanvasForDesignSize } from '@/utils/designScale'

describe('Grid Lines design scaling', () => {
  it('scales dimensions, spacing, and line width while preserving rotation', () => {
    const scaled = scaleElementConfig({
      id: 'grid-scale',
      eleType: 'gridLines',
      left: 227,
      top: 227,
      width: 200,
      height: 80,
      spacing: 20,
      lineWidth: 2,
      color: '#FFFFFF',
      colorProperty: null,
      rotation: 37,
      originX: 'center',
      originY: 'center',
    }, { width: 454, height: 454 }, { width: 227, height: 227 }) as any

    expect(scaled).toMatchObject({
      left: 113.5,
      top: 113.5,
      width: 100,
      height: 40,
      spacing: 10,
      lineWidth: 1,
      rotation: 37,
    })
  })

  it('scales the group once and lets its renderer rebuild children', () => {
    const child = {
      left: -100,
      top: -40,
      width: 200,
      height: 80,
      set(key: string, value: unknown) {
        ;(this as any)[key] = value
      },
    }
    const group: any = {
      eleType: 'gridLines',
      left: 227,
      top: 227,
      width: 200,
      height: 80,
      spacing: 20,
      lineWidth: 2,
      getObjects: () => [child],
      set(keyOrPatch: string | Record<string, unknown>, value?: unknown) {
        if (typeof keyOrPatch === 'string') this[keyOrPatch] = value
        else Object.assign(this, keyOrPatch)
      },
      fire: vi.fn(),
      setCoords: vi.fn(),
    }
    const canvas: any = {
      getObjects: () => [group],
      requestRenderAll: vi.fn(),
    }

    scaleFabricCanvasForDesignSize(
      canvas,
      { width: 454, height: 454 },
      { width: 227, height: 227 },
    )

    expect(group).toMatchObject({
      left: 113.5,
      top: 113.5,
      width: 100,
      height: 40,
      spacing: 10,
      lineWidth: 1,
    })
    expect(child).toMatchObject({ left: -100, top: -40, width: 200, height: 80 })
    expect(group.fire).toHaveBeenCalledWith('modified')
  })
})
