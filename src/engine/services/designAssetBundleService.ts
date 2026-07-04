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

type RestoreBundleOptions = {
  assetBundleUrl?: string | null
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

const parseManifest = async (zip: JSZip): Promise<DesignAssetManifest | null> => {
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) return null
  try {
    return JSON.parse(await manifestFile.async('string')) as DesignAssetManifest
  } catch (error) {
    console.warn('[designAssetBundle] Failed to parse manifest.json', error)
    return null
  }
}

const getIconUnicodeFromPath = (path: string): string => {
  const fileName = path.split('/').pop() || ''
  return decodeURIComponent(fileName.replace(/\.[^.]+$/, '')).trim()
}

const getMimeTypeForBundlePath = (path: string): string => {
  return /\.png$/i.test(path) ? 'image/png' : 'image/svg+xml'
}

const getBundleAssetEntries = (zip: JSZip, manifest: DesignAssetManifest | null): ManifestWeatherAsset[] => {
  if (manifest?.weather?.amoled?.length) {
    return manifest.weather.amoled.filter((item) => item?.path && item?.iconUnicode)
  }

  return Object.keys(zip.files)
    .filter((path) => /^weather\/amoled\/[^/]+\.(svg|png)$/i.test(path) && !zip.files[path].dir)
    .map((path) => {
      const iconUnicode = getIconUnicodeFromPath(path)
      const format = /\.png$/i.test(path) ? 'png' : 'svg'
      return {
        condition: iconUnicode,
        iconUnicode,
        path,
        format,
      }
    })
    .filter((item) => item.iconUnicode)
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

export async function restoreDesignAssetBundle(
  config: RuntimeDesignConfig,
  options: RestoreBundleOptions,
): Promise<RuntimeDesignConfig> {
  const pendingStore = useWeatherAmoledIconStore()
  pendingStore.clearAll()

  if (!config?.elements?.length) return config

  const weatherElements = getAmoledWeatherElements(config)
  if (!weatherElements.length) return config

  const assetBundleUrl = String(options.assetBundleUrl || '').trim()
  if (!assetBundleUrl) return config

  try {
    const response = await fetch(toAbsoluteUrl(assetBundleUrl))
    if (!response.ok) {
      throw new Error(`Failed to fetch design asset bundle: ${assetBundleUrl}`)
    }

    const zip = await JSZip.loadAsync(await response.blob())
    const manifest = await parseManifest(zip)
    const assets = getBundleAssetEntries(zip, manifest)
    if (!assets.length) return config

    const weatherFontSlugs = Array.from(new Set(
      weatherElements
        .map((element: any) => String(element.fontFamily || '').trim())
        .filter(Boolean),
    ))
    if (!weatherFontSlugs.length) return config

    const restoredUrlByFontAndUnicode = new Map<string, string>()

    for (const asset of assets) {
      const iconUnicode = String(asset.iconUnicode || '').trim()
      if (!iconUnicode) continue

      const fileEntry = zip.file(asset.path)
      if (!fileEntry) continue

      const blob = await fileEntry.async('blob')
      const fileName = `${iconUnicode}.${asset.format || (getMimeTypeForBundlePath(asset.path) === 'image/png' ? 'png' : 'svg')}`
      const file = new File([blob], fileName, { type: getMimeTypeForBundlePath(asset.path) })

      for (const fontSlug of weatherFontSlugs) {
        if (!fontSlug) continue

        pendingStore.upsertPending({
          fontSlug,
          iconUnicode,
          condition: asset.condition || iconUnicode,
          file,
        })

        const pending = pendingStore.getPending(fontSlug, iconUnicode)
        if (pending?.objectUrl) {
          restoredUrlByFontAndUnicode.set(`${fontSlug}::${iconUnicode}`, pending.objectUrl)
        }
      }
    }

    for (const element of weatherElements) {
      const fontSlug = String((element as any).fontFamily || '').trim()
      const iconUnicode = String((element as any).amoledIconUnicode || '').trim()
      if (!fontSlug || !iconUnicode) continue

      const objectUrl = restoredUrlByFontAndUnicode.get(`${fontSlug}::${iconUnicode}`)
      if (objectUrl) {
        const mutableElement = element as AnyElementConfig & {
          amoledImageUrl?: string
          imageUrl?: string
        }
        mutableElement.amoledImageUrl = objectUrl
        mutableElement.imageUrl = objectUrl
      }
    }
  } catch (error) {
    console.warn('[designAssetBundle] Failed to restore design asset bundle', error)
  }

  return config
}
