import type { IconGlyphAssetVO } from '@/api/wristo/iconGlyph'
import type { SvgIconFontSlot, SvgIconSource } from '@/features/bitmap-font-maker/svgIconPackageBuilder'
import { validateWeatherSvgSource } from '@/features/bitmap-font-maker/weatherSourceSet'

type FetchSvg = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface SvgIconSourceError {
  iconUnicode: string
  label: string
  fileName: string
  resource: string
  code: string
}

export class SvgIconSourceCollectionError extends Error {
  constructor(readonly errors: SvgIconSourceError[]) {
    super(errors[0]?.code || 'SVG_ICON_SOURCE_ERRORS')
    this.name = 'SvgIconSourceCollectionError'
  }
}

export async function loadSvgIconBuildSources(
  slots: readonly SvgIconFontSlot[],
  relations: IconGlyphAssetVO[],
  fetchSvg: FetchSvg = fetch,
): Promise<SvgIconSource[]> {
  const byCode = new Map(relations.map((relation) => [String(relation.icon?.iconUnicode || '').toLowerCase(), relation]))
  const sources: SvgIconSource[] = []
  const errors: SvgIconSourceError[] = []
  for (const slot of slots) {
    const relation = byCode.get(slot.iconUnicode)
    const asset = relation?.asset
    const fileName = `${slot.iconUnicode}-${slot.symbolCode}.svg`
    const resource = String(asset?.svgFile || asset?.previewUrl || asset?.imageUrl || '')
    if (!asset) {
      errors.push({ iconUnicode: slot.iconUnicode, label: slot.label, fileName, resource: '', code: 'SVG_ICON_SOURCE_SET_INCOMPLETE' })
      continue
    }
    let svg = String(asset.svgContent || '')
    try {
      if (!svg) {
        if (!resource) throw new Error('SVG_ICON_SOURCE_SET_INCOMPLETE')
        const response = await fetchSvg(resource)
        if (!response.ok) throw new Error(`SVG_ICON_SOURCE_FETCH_FAILED (${response.status})`)
        svg = await response.text()
      }
      validateWeatherSvgSource(svg)
      sources.push({
        iconUnicode: slot.iconUnicode,
        fileName,
        svg,
      })
    } catch (reason) {
      errors.push({
        iconUnicode: slot.iconUnicode,
        label: slot.label,
        fileName,
        resource,
        code: reason instanceof Error ? reason.message : 'SVG_ICON_SOURCE_INVALID',
      })
    }
  }
  if (errors.length) throw new SvgIconSourceCollectionError(errors)
  return sources
}
