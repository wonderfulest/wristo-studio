import { describe, expect, it } from 'vitest'
import { getBundleAssetMimeType } from '@/engine/services/bundleAssetMime'

describe('design asset bundle MIME types', () => {
  it('restores SVG assets with an SVG image MIME type', () => {
    expect(getBundleAssetMimeType('assets/centerCap/center_cap.svg')).toBe('image/svg+xml')
  })

  it('restores common raster assets with their image MIME types', () => {
    expect(getBundleAssetMimeType('assets/background.png')).toBe('image/png')
    expect(getBundleAssetMimeType('assets/photo.jpg')).toBe('image/jpeg')
    expect(getBundleAssetMimeType('assets/photo.webp')).toBe('image/webp')
  })
})
