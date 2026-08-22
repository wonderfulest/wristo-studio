import { describe, expect, it } from 'vitest'
import { decodeImage, encodeImage } from './image.encoder'

describe('image asset library type', () => {
  it('preserves mask provenance while keeping eleType image', () => {
    const encoded = encodeImage({
      id: 'mask-1',
      eleType: 'image',
      assetType: 'mask',
      left: 10,
      top: 20,
      width: 40,
      height: 50,
      scaleX: 1,
      scaleY: 1,
    } as any)

    expect(encoded).toMatchObject({ eleType: 'image', assetType: 'mask' })
    expect(decodeImage(encoded)).toMatchObject({ eleType: 'image', assetType: 'mask' })
  })
})
