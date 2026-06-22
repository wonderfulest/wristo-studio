declare module 'gifenc' {
  export type GifPalette = number[][]

  export type QuantizeOptions = {
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
    oneBitAlpha?: boolean | number
    clearAlpha?: boolean
    clearAlphaThreshold?: number
    clearAlphaColor?: number
  }

  export type GifFrameOptions = {
    palette?: GifPalette
    delay?: number
    repeat?: number
    transparent?: boolean
    transparentIndex?: number
    dispose?: number
    first?: boolean
  }

  export type GifEncoder = {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifFrameOptions): void
    finish(): void
    bytes(): Uint8Array
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoder
  export function quantize(data: Uint8Array | Uint8ClampedArray, maxColors: number, options?: QuantizeOptions): GifPalette
  export function applyPalette(data: Uint8Array | Uint8ClampedArray, palette: GifPalette, format?: 'rgb565' | 'rgb444' | 'rgba4444'): Uint8Array
}
