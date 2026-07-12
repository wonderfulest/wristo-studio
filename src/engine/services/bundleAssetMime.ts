const MIME_BY_EXTENSION: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

export const getBundleAssetMimeType = (path: string): string => {
  const cleanPath = String(path || '').split(/[?#]/, 1)[0].toLowerCase()
  const extension = cleanPath.includes('.') ? cleanPath.slice(cleanPath.lastIndexOf('.') + 1) : ''
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream'
}
