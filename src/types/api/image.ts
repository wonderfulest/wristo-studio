export interface ImageFormatSize {
  url: string
  width?: number
  height?: number
  mime?: string
  size?: number
  sizeInBytes?: number
  name?: string
}
export interface ImageFormats {
  thumbnail?: ImageFormatSize
  medium?: ImageFormatSize
  large?: ImageFormatSize
  small?: ImageFormatSize
  [key: string]: ImageFormatSize | undefined
}
export interface ImageBase {
  url: string
  previewUrl?: string
  formats?: ImageFormats
  name?: string
  width?: number
  height?: number
  mime?: string
}
export interface Image extends ImageBase { id: number }
