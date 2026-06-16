export type PackageFileType = 'iq' | 'prg'

const timestampForFilename = (date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

const sanitizeFilenamePart = (value: string): string => {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const buildPackageFilename = (appName: string, fileType: PackageFileType): string => {
  const safeAppName = sanitizeFilenamePart(appName) || 'wristo-app'
  return `${safeAppName}-${timestampForFilename()}-${fileType}.${fileType}`
}

export const downloadPackageFile = async (
  url: string,
  appName: string,
  fileType: PackageFileType,
): Promise<void> => {
  const filename = buildPackageFilename(appName, fileType)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  } catch {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}
