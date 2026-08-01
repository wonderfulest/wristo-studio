import { describe, expect, it } from 'vitest'

import { encodeCenterCap } from './centerCap.encoder'

describe('encodeCenterCap', () => {
  it('rounds the rendered target size to an integer', () => {
    const encoded = encodeCenterCap({
      width: 31,
      height: 20,
      scaleX: 1.05,
      scaleY: 1.05,
    } as any)

    expect(encoded.targetSize).toBe(33)
  })
})
