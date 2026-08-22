// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { elementConfigs } from '@/elements/schemaMap'

describe('rotating hand schema registration', () => {
  it('exposes rotatingHand in the hands element category', () => {
    expect(elementConfigs.hands.rotatingHand).toMatchObject({
      eleType: 'rotatingHand',
      label: 'Rotating Hand',
      disabled: false,
    })
  })
})
