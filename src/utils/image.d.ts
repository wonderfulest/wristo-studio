declare module '@/utils/image' {
  export function uploadHandSVG(svgUrl: string, type: string): Promise<string>
  export function uploadImageFile(blobUrl: string, type: string): Promise<string>
  export function uploadBase64Image(base64Data: string, type: string): Promise<string>
} 