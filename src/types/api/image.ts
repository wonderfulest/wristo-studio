export interface ImageFormatSize { url: string }
export interface ImageFormats {
  thumbnail?: ImageFormatSize
  medium?: ImageFormatSize
  large?: ImageFormatSize
}
export interface ImageBase { url: string; previewUrl?: string; formats?: ImageFormats }
export interface Image extends ImageBase { id: number }
