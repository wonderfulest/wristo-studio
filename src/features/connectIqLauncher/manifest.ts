import type { LauncherArchitecture, LauncherPlatform, LauncherRelease } from './config'
import { getLauncherReleases } from './config'

export const DEFAULT_LAUNCHER_MANIFEST_URL = 'https://cdn.wristo.io/launcher/releases/latest.json'
export type MacLauncherArch = 'arm64' | 'x64' | 'universal'

const allowedHosts = new Set(['cdn.wristo.io', 'cdn.wristo.cn'])
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const sha256Pattern = /^[a-f0-9]{64}$/
const macArchitectures: MacLauncherArch[] = ['arm64', 'x64', 'universal']

interface ArtifactRecord {
  url: string
  sha256: string
  size: number
}

export interface LauncherManifestLoadResult {
  releases: Record<LauncherPlatform, LauncherRelease>
  macReleases: Partial<Record<MacLauncherArch, LauncherRelease>>
  macArchitectures: MacLauncherArch[]
  source: 'manifest' | 'fallback'
}

const fallbackResult = (fallback: Record<LauncherPlatform, LauncherRelease>): LauncherManifestLoadResult => ({
  releases: fallback,
  macReleases: {},
  macArchitectures: [],
  source: 'fallback'
})

const safeCdnUrl = (value: unknown, expectedFilename: string): string => {
  if (typeof value !== 'string') throw new Error('artifact URL must be a string')
  if (/^https:\/\/[^/]+:\d+(?:\/|$)/.test(value)) throw new Error('artifact URL must not include an explicit port')
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !allowedHosts.has(parsed.hostname)) {
    throw new Error('artifact URL is not an allowed Wristo CDN URL')
  }
  const filename = decodeURIComponent(parsed.pathname.split('/').pop() || '')
  if (filename !== expectedFilename) throw new Error(`artifact filename mismatch: ${filename}`)
  return parsed.toString()
}

const requireHash = (value: unknown): string => {
  if (typeof value !== 'string' || !sha256Pattern.test(value)) throw new Error('invalid SHA-256')
  return value
}

const requireSize = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw new Error('invalid artifact size')
  return value as number
}

const requireRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected object')
  return value as Record<string, unknown>
}

const parseArtifact = (value: unknown, expectedFilename: string): ArtifactRecord => {
  const record = requireRecord(value)
  return {
    url: safeCdnUrl(record.url, expectedFilename),
    sha256: requireHash(record.sha256),
    size: requireSize(record.size)
  }
}

const validateManifestUrl = (value: string): string => {
  if (/^https:\/\/[^/]+:\d+(?:\/|$)/.test(value)) throw new Error('manifest URL must not include an explicit port')
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !allowedHosts.has(parsed.hostname)) {
    throw new Error('manifest URL is not an allowed Wristo CDN URL')
  }
  return parsed.toString()
}

const parseManifest = (value: unknown, fallback: Record<LauncherPlatform, LauncherRelease>): LauncherManifestLoadResult => {
  const root = requireRecord(value)
  if (typeof root.version !== 'string' || !versionPattern.test(root.version)) throw new Error('invalid manifest version')
  const version = root.version
  if (typeof root.publishedAt !== 'string' || Number.isNaN(Date.parse(root.publishedAt))) throw new Error('invalid publishedAt')
  const platforms = requireRecord(root.platforms)
  const mac = requireRecord(platforms.mac)
  const availableMacArchitectures = macArchitectures.filter((arch) => arch in mac)
  if (availableMacArchitectures.length === 0 || Object.keys(mac).some((arch) => !macArchitectures.includes(arch as MacLauncherArch))) {
    throw new Error('invalid macOS architecture set')
  }
  const parsedMac: Partial<Record<MacLauncherArch, LauncherRelease>> = {}
  for (const arch of availableMacArchitectures) {
    const filename = `Wristo_Connect_IQ_Launcher_${version}_macos_${arch}.dmg`
    const artifact = parseArtifact(mac[arch], filename)
    parsedMac[arch] = {
      platform: 'mac',
      architecture: arch,
      available: true,
      url: artifact.url,
      version,
      sha256: artifact.sha256,
      requirements: fallback.mac.requirements
    }
  }
  const windowsRoot = requireRecord(platforms.windows)
  if (Object.keys(windowsRoot).length !== 1 || !('x64' in windowsRoot)) throw new Error('invalid Windows architecture set')
  const windows = requireRecord(windowsRoot.x64)
  const nsis = parseArtifact(windows, `Wristo_Connect_IQ_Launcher_${version}_windows_x64_setup.exe`)
  safeCdnUrl(windows.msiUrl, `Wristo_Connect_IQ_Launcher_${version}_windows_x64.msi`)
  requireHash(windows.msiSha256)
  requireSize(windows.msiSize)
  const preferredMacArch = availableMacArchitectures.includes('universal') ? 'universal' : availableMacArchitectures[0]
  return {
    releases: {
      mac: parsedMac[preferredMacArch]!,
      windows: {
        platform: 'windows',
        architecture: 'x64' as LauncherArchitecture,
        available: true,
        url: nsis.url,
        version,
        sha256: nsis.sha256,
        requirements: fallback.windows.requirements
      }
    },
    macReleases: parsedMac,
    macArchitectures: availableMacArchitectures,
    source: 'manifest'
  }
}

export async function loadLauncherReleases(options: {
  manifestUrl?: string
  fetchFn?: typeof fetch
  fallback?: Record<LauncherPlatform, LauncherRelease>
  timeoutMs?: number
} = {}): Promise<LauncherManifestLoadResult> {
  const fallback = options.fallback ?? getLauncherReleases()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000)
  try {
    const fetchFn = options.fetchFn ?? globalThis.fetch
    if (!fetchFn) throw new Error('Fetch API is unavailable')
    const manifestUrl = validateManifestUrl(options.manifestUrl ?? DEFAULT_LAUNCHER_MANIFEST_URL)
    const response = await fetchFn(manifestUrl, { signal: controller.signal, cache: 'no-cache' })
    if (!response.ok) throw new Error(`manifest request failed: ${response.status}`)
    return parseManifest(await response.json(), fallback)
  } catch {
    return fallbackResult(fallback)
  } finally {
    clearTimeout(timeout)
  }
}
