import JSZip from 'jszip'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import { getWeatherConditions } from '@/api/wristo/weather'
import type { WeatherConditionAssetsVO } from '@/types/api/weather'
import { useWeatherAmoledIconStore, type PendingWeatherAmoledIcon } from '@/stores/weatherAmoledIconStore'

type ManifestWeatherAsset = {
  condition: string
  iconUnicode: string
  path: string
  format: string
  sourceUrl?: string
}

type DesignAssetManifest = {
  version: 1
  generatedAt: string
  designUid: string
  designName?: string
  weather: {
    amoled: ManifestWeatherAsset[]
  }
}

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value)
const isDataUrl = (value: string): boolean => /^data:/i.test(value)

const toAbsoluteUrl = (url: string): string => {
  if (!url) return ''
  if (isHttpUrl(url) || isDataUrl(url)) return url
  if (url.startsWith('//')) return `${window.location.protocol}${url}`
  if (url.startsWith('/')) return url
  return `/${url}`
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl)
  return response.blob()
}

const getAmoledWeatherElements = (config: RuntimeDesignConfig): AnyElementConfig[] => {
  return (config.elements || []).filter((element: any) => {
    return element?.eleType === 'weather' && (element.weatherDisplayType || 'amoled') === 'amoled'
  })
}

const pickWeatherAssetSource = (item: WeatherConditionAssetsVO): string => {
  const asset = item.asset
  if (!asset) return ''
  if (asset.svgContent?.trim()) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svgContent.trim())}`
  }
  return asset.svgFile || asset.imageUrl || asset.previewUrl || ''
}

const getFileFormat = (file?: File): 'svg' | 'png' => {
  if (!file) return 'svg'
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  return type === 'image/png' || name.endsWith('.png') ? 'png' : 'svg'
}

const getWeatherAssetFormat = (item: WeatherConditionAssetsVO): 'svg' | 'png' => {
  const asset = item.asset
  if (!asset) return 'svg'
  if (asset.svgContent?.trim()) return 'svg'
  const format = String(asset.format || '').toLowerCase()
  const source = String(asset.imageUrl || asset.previewUrl || asset.svgFile || '').toLowerCase()
  return format === 'png' || /\.png(?:$|\?)/i.test(source) ? 'png' : 'svg'
}

const fetchBlob = async (source: string): Promise<Blob> => {
  const normalized = toAbsoluteUrl(source)
  if (!normalized) throw new Error('Empty asset source')
  if (isDataUrl(normalized)) return dataUrlToBlob(normalized)
  const response = await fetch(normalized)
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${normalized}`)
  }
  return response.blob()
}

const addWeatherAssetToBundle = async (
  zip: JSZip,
  manifest: DesignAssetManifest,
  usedPaths: Set<string>,
  input: {
    condition: string
    iconUnicode: string
    source?: string
    file?: File
    format?: 'svg' | 'png'
  },
) => {
  const iconUnicode = String(input.iconUnicode || '').trim()
  if (!iconUnicode) return

  const format = input.format || getFileFormat(input.file)
  const path = `weather/amoled/${iconUnicode}.${format}`
  if (usedPaths.has(path)) return
  usedPaths.add(path)

  if (input.file) {
    zip.file(path, input.file)
  } else if (input.source) {
    zip.file(path, await fetchBlob(input.source))
  } else {
    return
  }

  manifest.weather.amoled.push({
    condition: String(input.condition || iconUnicode),
    iconUnicode,
    path,
    format,
    sourceUrl: input.source && !isDataUrl(input.source) ? input.source : undefined,
  })
}

export async function buildDesignAssetBundle(config: RuntimeDesignConfig): Promise<File | null> {
  const weatherElements = getAmoledWeatherElements(config)
  if (!weatherElements.length) return null
  const pendingStore = useWeatherAmoledIconStore()

  const zip = new JSZip()
  const manifest: DesignAssetManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    designUid: String((config as any).designId || ''),
    designName: config.name,
    weather: {
      amoled: [],
    },
  }

  const weatherFontSlugs = Array.from(new Set(
    weatherElements
      .map((element: any) => String(element.fontFamily || '').trim())
      .filter(Boolean),
  ))

  const usedPaths = new Set<string>()
  const pendingByFontAndUnicode = new Map<string, PendingWeatherAmoledIcon>()
  pendingStore.listByFontSlugs(weatherFontSlugs).forEach((item) => {
    pendingByFontAndUnicode.set(`${item.fontSlug}::${item.iconUnicode}`, item)
  })

  for (const fontSlug of weatherFontSlugs) {
    const response = await getWeatherConditions(fontSlug, 'amoled')
    for (const item of response.data || []) {
      const iconUnicode = String(item.iconUnicode || item.condition || '').trim()
      if (!iconUnicode) continue
      const pending = pendingByFontAndUnicode.get(`${fontSlug}::${iconUnicode}`)
      if (pending) {
        await addWeatherAssetToBundle(zip, manifest, usedPaths, {
          condition: pending.condition || String(item.condition || iconUnicode),
          iconUnicode,
          file: pending.file,
        })
        continue
      }

      const source = pickWeatherAssetSource(item)
      if (!source) continue
      await addWeatherAssetToBundle(zip, manifest, usedPaths, {
        condition: String(item.condition || iconUnicode),
        iconUnicode,
        source,
        format: getWeatherAssetFormat(item),
      })
    }
  }

  for (const pending of pendingByFontAndUnicode.values()) {
    await addWeatherAssetToBundle(zip, manifest, usedPaths, {
      condition: pending.condition,
      iconUnicode: pending.iconUnicode,
      file: pending.file,
    })
  }

  if (!manifest.weather.amoled.length) return null
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const designUid = String((config as any).designId || 'design')
  return new File([blob], `${designUid}-assets.zip`, { type: 'application/zip' })
}
