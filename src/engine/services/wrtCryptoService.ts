import type { ApiResponse } from '@/types/api/api'

const MAGIC = 'WRTENC01'
const MAX_FILE_BYTES = 64 * 1024 * 1024

async function transform(file: File, operation: 'encrypt' | 'decrypt'): Promise<File> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error('WRT file exceeds the 64 MiB limit')
  // Lazy load the authenticated client: legacy/offline imports do not require a session.
  const { default: instance } = await import('@/config/axios')
  const body = new FormData()
  body.append('file', file)
  const result = await instance.post<unknown, ApiResponse<string>>(`/dsn/wrt/${operation}`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    suppressForbiddenRedirect: true,
  })
  if (result.code !== 0 || typeof result.data !== 'string') {
    throw new Error(result.msg || 'Unable to process encrypted WRT')
  }
  const decoded = atob(result.data)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
  return new File([bytes], file.name, { type: 'application/octet-stream' })
}

export async function encryptWrtFile(file: File): Promise<File> {
  const encrypted = await transform(file, 'encrypt')
  if (!(await isEncryptedWrt(encrypted))) throw new Error('Server did not return an encrypted WRT')
  return encrypted
}

export async function isEncryptedWrt(file: File): Promise<boolean> {
  return (await file.slice(0, MAGIC.length).text()) === MAGIC
}

export async function decryptWrtFileIfNeeded(file: File): Promise<File> {
  return (await isEncryptedWrt(file)) ? transform(file, 'decrypt') : file
}
