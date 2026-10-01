import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { FaceDetail } from './catalog'

export type FaceImages = NonNullable<FaceDetail['productImages']>
export async function uploadFaceImages(appId: number, files: File[]): Promise<FaceImages> {
  const body = new FormData()
  files.forEach(file => body.append('files', file))
  const result: ApiResponse<FaceImages> = await instance.post(`/dsn/products/${appId}/images`, body, {
    headers: { 'Content-Type': undefined }, timeout: 120000, suppressForbiddenRedirect: true,
  })
  if (!Array.isArray(result.data)) throw new Error('Could not upload images. Please try again.')
  return result.data
}
export async function updateFaceDescription(appId: number, description: string): Promise<string> {
  const result: ApiResponse<{ description: string }> = await instance.patch(`/dsn/products/${appId}/description`, { description }, { suppressForbiddenRedirect: true })
  if (typeof result.data?.description !== 'string') throw new Error('Could not save the description. Please try again.')
  return result.data.description
}
export function contentError(cause: unknown, fallback: string): string {
  if (cause && typeof cause === 'object') {
    const error = cause as { message?: string; msg?: string }
    return error.msg || error.message || fallback
  }
  return fallback
}

// Treat raw HTML as text, while keeping existing plain-text line breaks readable.
export function configureDescriptionMarkdown(md: { set: (options: { html: boolean; breaks: boolean; linkify: boolean }) => unknown }) {
  md.set({ html: false, breaks: true, linkify: true })
}
