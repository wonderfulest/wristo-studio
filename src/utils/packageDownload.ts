import { trackConversion } from './studioConversion'
import { useUserStore } from '@/stores/user'
export type PackageFileType = 'iq' | 'prg'

export const downloadPackageFile = async (
  url: string,
  _appName?: string,
  _fileType?: PackageFileType,
  productId?: number,
): Promise<void> => {
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  trackConversion('download_start', useUserStore().token || '', productId)
  link.remove()
}
