// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import * as rendererModule from './gridLines.renderer'

const createConfig = () => ({
  id: 'grid-render',
  eleType: 'gridLines',
  left: 227,
  top: 227,
  width: 200,
  height: 80,
  spacing: 20,
  lineWidth: 2,
  color: '#00FF00',
  colorProperty: null,
  rotation: 35,
  originX: 'center',
  originY: 'center',
} as any)

describe('Grid Lines renderer', () => {
  it('creates a selectable rotated group with centered line children', async () => {
    const renderer = await import(/* @vite-ignore */ './gridLines.renderer').catch(() => null)

    expect(renderer).not.toBeNull()
    const group = renderer?.createGridLinesGroup(createConfig()) as any

    expect(group).toMatchObject({
      id: 'grid-render',
      eleType: 'gridLines',
      designerControlMode: 'resize8Rotate',
      width: 200,
      height: 80,
      angle: 35,
      spacing: 20,
      lineWidth: 2,
      color: '#00FF00',
    })
    const lines = group.getObjects().filter((object: any) => object.type === 'line')
    expect(lines).toHaveLength(5)
    expect(lines.map((line: any) => [line.x1, line.y1, line.x2, line.y2])).toEqual([
      [-100, -40, 100, -40],
      [-100, -20, 100, -20],
      [-100, 0, 100, 0],
      [-100, 20, 100, 20],
      [-100, 40, 100, 40],
    ])
  })

  it('bakes canvas scale and rebuilds the line geometry without losing rotation', () => {
    const group = rendererModule.createGridLinesGroup(createConfig()) as any
    group.set({ scaleX: 1.5, scaleY: 0.5, angle: 73 })
    const bakeGridLinesTransform = (rendererModule as any).bakeGridLinesTransform

    expect(bakeGridLinesTransform).toBeTypeOf('function')
    bakeGridLinesTransform(group)

    expect(group).toMatchObject({ width: 300, height: 40, scaleX: 1, scaleY: 1, angle: 73 })
    const lines = group.getObjects().filter((object: any) => object.type === 'line')
    expect(lines.map((line: any) => [line.x1, line.y1, line.x2, line.y2])).toEqual([
      [-150, -20, 150, -20],
      [-150, 0, 150, 0],
      [-150, 20, 150, 20],
    ])
  })

  it('rebuilds the group when editable Grid Lines properties change', () => {
    const group = rendererModule.createGridLinesGroup(createConfig()) as any
    const updateGridLines = (rendererModule as any).updateGridLines

    expect(updateGridLines).toBeTypeOf('function')
    updateGridLines(group, {
      width: 100,
      height: 40,
      spacing: 10,
      lineWidth: 3,
      color: '#123456',
      colorProperty: 'theme_grid',
      rotation: 90,
    }, { persist: false })

    expect(group).toMatchObject({
      width: 100,
      height: 40,
      spacing: 10,
      lineWidth: 3,
      color: '#123456',
      colorProperty: 'theme_grid',
      angle: 90,
    })
    const lines = group.getObjects().filter((object: any) => object.type === 'line')
    expect(lines).toHaveLength(5)
    expect(lines.every((line: any) => line.stroke === '#123456' && line.strokeWidth === 3)).toBe(true)
  })
})
