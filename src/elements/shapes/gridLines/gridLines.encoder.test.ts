import { describe, expect, it } from 'vitest'
import * as encoderModule from './gridLines.encoder'

describe('Grid Lines encoder', () => {
  it('persists scaled dimensions, styling, color binding, and rotation', async () => {
    const encoder = await import(/* @vite-ignore */ './gridLines.encoder').catch(() => null)

    expect(encoder).not.toBeNull()
    expect(encoder?.encodeGridLines({
      id: 'grid-1',
      eleType: 'gridLines',
      left: 227,
      top: 227,
      width: 200,
      height: 80,
      scaleX: 1.5,
      scaleY: 0.5,
      spacing: 20,
      lineWidth: 2,
      color: '#123456',
      colorProperty: 'theme_grid',
      angle: 90,
      originX: 'center',
      originY: 'center',
    } as any)).toEqual({
      eleType: 'gridLines',
      id: 'grid-1',
      left: 227,
      top: 227,
      width: 300,
      height: 40,
      spacing: 20,
      lineWidth: 2,
      color: '#123456',
      colorProperty: 'theme_grid',
      rotation: 90,
      originX: 'center',
      originY: 'center',
    })
  })

  it('restores the saved rotation as the Fabric angle', () => {
    const decodeGridLines = (encoderModule as any).decodeGridLines

    expect(decodeGridLines).toBeTypeOf('function')
    expect(decodeGridLines({
      eleType: 'gridLines',
      id: 'grid-2',
      left: 100,
      top: 120,
      width: 160,
      height: 60,
      spacing: 15,
      lineWidth: 3,
      color: '#ABCDEF',
      colorProperty: null,
      rotation: 37,
      originX: 'center',
      originY: 'center',
    })).toMatchObject({
      eleType: 'gridLines',
      id: 'grid-2',
      width: 160,
      height: 60,
      spacing: 15,
      lineWidth: 3,
      color: '#ABCDEF',
      rotation: 37,
      angle: 37,
    })
  })
})
