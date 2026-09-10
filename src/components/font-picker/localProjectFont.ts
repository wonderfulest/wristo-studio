import type { DesignFontVO } from '@/types/font'
import type { ParsedFontInfo } from '@/types/font-parse'

/** A project-owned font source; no library upload or server resource ID is needed. */
export async function createLocalProjectFont(
  file: File,
  info: ParsedFontInfo,
  type: string,
  language: string,
): Promise<DesignFontVO> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
  const family = info.family || info.fullName || file.name.replace(/\.(ttf|otf)$/i, '')
  return {
    id: 0,
    slug: `local-${hash}`,
    fullName: info.fullName || family,
    family,
    postscriptName: info.postscriptName || family,
    subfamily: info.subfamily || '',
    language,
    type,
    weight: String(info.weightClass || 400),
    versionName: info.version || '',
    glyphCount: info.glyphCount,
    isMonospace: Number(Boolean(info.isMonospace)),
    italic: Number(Boolean(info.italic)),
    weightClass: info.weightClass || 400,
    widthClass: info.widthClass || 5,
    copyright: info.copyright || '',
    isSystem: 0,
    status: 'local',
    ttf: 0,
    ttfFile: { id: 0, name: file.name, url: URL.createObjectURL(file), previewUrl: '', provider: 'local' },
  }
}
