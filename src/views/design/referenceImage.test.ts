// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { prepareReferenceImage } from './referenceImage'
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('rejects unsupported files and oversized uploads before decoding', async () => {
  await expect(prepareReferenceImage(new File(['svg'], 'x.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG or JPEG')
  const large = new File([], 'x.png', { type: 'image/png' })
  Object.defineProperty(large, 'size', { value: 10 * 1024 * 1024 + 1 })
  await expect(prepareReferenceImage(large)).rejects.toThrow('10 MB')
})
function mockDecode(width: number, height: number) {
  vi.stubGlobal('FileReader', class {
    result = 'data:image/png;base64,aW1hZ2U='
    onload?: () => void
    readAsDataURL() { this.onload?.() }
  })
  vi.stubGlobal('Image', class {
    naturalWidth = width
    naturalHeight = height
    onload?: () => void
    set src(_value: string) { this.onload?.() }
  })
}
it('resizes large images proportionally and re-encodes local image content', async () => {
  mockDecode(4000, 2000)
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as any)
  let dimensions: number[] = []
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement) {
    dimensions = [this.width, this.height]
    return 'data:image/png;base64,aW1hZ2U='
  })
  await expect(prepareReferenceImage(new File(['png'], 'x.png', { type: 'image/png' }))).resolves.toBe('data:image/png;base64,aW1hZ2U=')
  expect(dimensions).toEqual([1600, 800]); expect(drawImage).toHaveBeenCalledOnce()
})
it('rejects excessive decoded dimensions before creating a canvas', async () => {
  mockDecode(10000, 10000)
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
  await expect(prepareReferenceImage(new File(['png'], 'x.png', { type: 'image/png' }))).rejects.toThrow('too large to process')
  expect(context).not.toHaveBeenCalled()
})
it('reports FileReader failures', async () => {
  vi.stubGlobal('FileReader', class {
    onerror?: () => void
    readAsDataURL() { this.onerror?.() }
  })
  await expect(prepareReferenceImage(new File(['png'], 'x.png', { type: 'image/png' }))).rejects.toThrow('Unable to read')
})
