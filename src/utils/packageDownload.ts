export type PackageFileType = 'iq' | 'prg'

export const downloadPackageFile = async (
  url: string,
  _appName?: string,
  _fileType?: PackageFileType,
): Promise<void> => {
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
