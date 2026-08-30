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

  it('persists rotation and restores it as the Fabric angle', () => {
    const encoded = encodeImage({
      id: 'image-rotated',
      eleType: 'image',
      left: 30,
      top: 40,
      width: 60,
      height: 80,
      scaleX: 1,
      scaleY: 1,
      angle: 37,
    } as any)

    expect(encoded.rotation).toBe(37)
    expect(decodeImage(encoded)).toMatchObject({ angle: 37, rotation: 37 })
  })
})
