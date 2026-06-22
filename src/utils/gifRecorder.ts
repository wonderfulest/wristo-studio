import { GIFEncoder, applyPalette, quantize, type GifPalette } from 'gifenc'

export type GifFrameSource = {
  dataURL: string
  delayMs: number
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load GIF frame image'))
    image.src = src
  })
}

const dataURLToImageData = async (src: string): Promise<ImageData> => {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, image.naturalWidth || image.width)
  canvas.height = Math.max(1, image.naturalHeight || image.height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Failed to read GIF frame canvas')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

export async function encodeGifFrames(frames: GifFrameSource[]): Promise<Blob> {
  if (!frames.length) throw new Error('No GIF frames captured')

  const gif = GIFEncoder()
  let width = 0
  let height = 0
  let globalPalette: GifPalette | null = null

  for (const [index, frame] of frames.entries()) {
    const imageData = await dataURLToImageData(frame.dataURL)
    if (index === 0) {
      width = imageData.width
      height = imageData.height
      globalPalette = quantize(imageData.data, 256)
    }
    if (imageData.width !== width || imageData.height !== height) {
      throw new Error('GIF frame sizes do not match')
    }
    if (!globalPalette) throw new Error('GIF palette was not initialized')

    const indexedFrame = applyPalette(imageData.data, globalPalette)
    gif.writeFrame(indexedFrame, width, height, {
      palette: index === 0 ? globalPalette : undefined,
      delay: frame.delayMs,
      repeat: 0,
    })
  }

  gif.finish()
  const bytes = gif.bytes()
  const output = new Uint8Array(bytes.length)
  output.set(bytes)
  return new Blob([output.buffer], { type: 'image/gif' })
}
