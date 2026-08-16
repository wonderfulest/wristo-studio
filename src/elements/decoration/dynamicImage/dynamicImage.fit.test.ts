import { describe, expect, it } from 'vitest'
import { calculateDynamicImageStretch } from './dynamicImage.fit'

describe('calculateDynamicImageStretch', () => {
  it('always stretches the source to the shared frame', () => {
    expect(calculateDynamicImageStretch(100, 50, 200, 200)).toEqual({ scaleX: 2, scaleY: 4 })
  })
})
