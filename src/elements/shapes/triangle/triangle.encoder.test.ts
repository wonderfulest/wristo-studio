import { describe, expect, it } from 'vitest'
import { decodeTriangle, encodeTriangle } from './triangle.encoder'

describe('triangle encoder', () => {
  it('round-trips triangle dimensions and visual properties', () => {
    const decoded = decodeTriangle({
      eleType: 'triangle',
      id: 'triangle-1',
      left: 10,
      top: 20,
      width: 120,
      height: 80,
      rotation: 35,
      fill: '#112233',
      stroke: '#ffffff',
      strokeWidth: 3,
      opacity: 0.8,
      gradientEnabled: true,
      gradientStartColor: '#112233',
      gradientEndColor: '#445566',
      gradientDirection: 'topToBottom',
    } as any) as any

    expect(decoded).toMatchObject({ eleType: 'triangle', width: 120, height: 80, rotation: 35 })
    expect(encodeTriangle(decoded)).toMatchObject({
      eleType: 'triangle',
      id: 'triangle-1',
      width: 120,
      height: 80,
      rotation: 35,
      fill: '#112233',
      stroke: '#ffffff',
      strokeWidth: 3,
      opacity: 0.8,
      gradientEnabled: true,
      gradientDirection: 'topToBottom',
    })
  })
})
