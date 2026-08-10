import type { PrgInstallerArchitecture, PrgInstallerPlatform, PrgInstallerRelease } from './config'
import { getPrgInstallerReleases } from './config'

export const DEFAULT_PRG_INSTALLER_MANIFEST_URL = 'https://cdn.wristo.io/prg-installer/releases/latest.json'
export type MacPrgInstallerArch = 'arm64' | 'x64' | 'universal'
export type WindowsInstallerKind = 'exe' | 'msi'

const allowedHosts = new Set(['cdn.wristo.io', 'cdn.wristo.cn'])
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const sha256Pattern = /^[a-f0-9]{64}$/
const macArchitectures: MacPrgInstallerArch[] = ['arm64', 'x64', 'universal']

interface ArtifactRecord {
  url: string
  sha256: string
  size: number
}

export interface PrgInstallerManifestLoadResult {
  releases: Record<PrgInstallerPlatform, PrgInstallerRelease>
  macReleases: Partial<Record<MacPrgInstallerArch, PrgInstallerRelease>>
  macArchitectures: MacPrgInstallerArch[]
  windowsInstallers: Partial<Record<WindowsInstallerKind, PrgInstallerRelease>>
  source: 'manifest' | 'fallback'
}

const fallbackResult = (fallback: Record<PrgInstallerPlatform, PrgInstallerRelease>): PrgInstallerManifestLoadResult => ({
  releases: fallback,
  macReleases: {},
  macArchitectures: [],
  windowsInstallers: {},
  source: 'fallback'
})

const safeCdnUrl = (value: unknown, expectedFilenames: string | string[]): string => {
  if (typeof value !== 'string') throw new Error('artifact URL must be a string')
  if (/^https:\/\/[^/]+:\d+(?:\/|$)/.test(value)) throw new Error('artifact URL must not include an explicit port')
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !allowedHosts.has(parsed.hostname)) {
    throw new Error('artifact URL is not an allowed Wristo CDN URL')
  }
  const filename = decodeURIComponent(parsed.pathname.split('/').pop() || '')
  const allowedFilenames = Array.isArray(expectedFilenames) ? expectedFilenames : [expectedFilenames]
  if (!allowedFilenames.includes(filename)) throw new Error(`artifact filename mismatch: ${filename}`)
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

const parseArtifact = (value: unknown, expectedFilenames: string | string[]): ArtifactRecord => {
  const record = requireRecord(value)
  return {
    url: safeCdnUrl(record.url, expectedFilenames),
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

const parseManifest = (value: unknown, fallback: Record<PrgInstallerPlatform, PrgInstallerRelease>): PrgInstallerManifestLoadResult => {
  const root = requireRecord(value)
  if (typeof root.version !== 'string' || !versionPattern.test(root.version)) throw new Error('invalid manifest version')
  const version = root.version
  if (typeof root.publishedAt !== 'string' || Number.isNaN(Date.parse(root.publishedAt))) throw new Error('invalid publishedAt')
  const platforms = requireRecord(root.platforms)
  const mac = requireRecord(platforms.mac)
  const availableMacArchitectures = macArchitectures.filter((arch) => arch in mac)
  if (availableMacArchitectures.length === 0 || Object.keys(mac).some((arch) => !macArchitectures.includes(arch as MacPrgInstallerArch))) {
    throw new Error('invalid macOS architecture set')
  }
  const parsedMac: Partial<Record<MacPrgInstallerArch, PrgInstallerRelease>> = {}
  for (const arch of availableMacArchitectures) {
    const filenames = [
      `Wristo_PRG_Installer_${version}_macos_${arch}.dmg`,
      `Wristo_PRG_Installer_${version}_macos_${arch}.dmg`
    ]
    const artifact = parseArtifact(mac[arch], filenames)
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
  const nsis = parseArtifact(windows, [
    `Wristo_PRG_Installer_${version}_windows_x64_setup.exe`,
    `Wristo_PRG_Installer_${version}_windows_x64_setup.exe`
  ])
  const msi = parseArtifact(
    { url: windows.msiUrl, sha256: windows.msiSha256, size: windows.msiSize },
    [
      `Wristo_PRG_Installer_${version}_windows_x64.msi`,
      `Wristo_PRG_Installer_${version}_windows_x64.msi`
    ]
  )
  const preferredMacArch = availableMacArchitectures.includes('universal') ? 'universal' : availableMacArchitectures[0]
  const windowsRelease = (artifact: ArtifactRecord): PrgInstallerRelease => ({
    platform: 'windows',
    architecture: 'x64' as PrgInstallerArchitecture,
    available: true,
    url: artifact.url,
    version,
    sha256: artifact.sha256,
    requirements: fallback.windows.requirements
  })
  return {
    releases: {
      mac: parsedMac[preferredMacArch]!,
      windows: windowsRelease(nsis)
    },
    macReleases: parsedMac,
    macArchitectures: availableMacArchitectures,
    windowsInstallers: {
      exe: windowsRelease(nsis),
      msi: windowsRelease(msi)
    },
    source: 'manifest'
  }
}

export async function loadPrgInstallerReleases(options: {
  manifestUrl?: string
  fetchFn?: typeof fetch
  fallback?: Record<PrgInstallerPlatform, PrgInstallerRelease>
  timeoutMs?: number
} = {}): Promise<PrgInstallerManifestLoadResult> {
  const fallback = options.fallback ?? getPrgInstallerReleases()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000)
  try {
    const fetchFn = options.fetchFn ?? globalThis.fetch
    if (!fetchFn) throw new Error('Fetch API is unavailable')
    const manifestUrl = validateManifestUrl(options.manifestUrl ?? DEFAULT_PRG_INSTALLER_MANIFEST_URL)
    const response = await fetchFn(manifestUrl, { signal: controller.signal, cache: 'no-cache' })
    if (!response.ok) throw new Error(`manifest request failed: ${response.status}`)
    return parseManifest(await response.json(), fallback)
  } catch {
    return fallbackResult(fallback)
  } finally {
    clearTimeout(timeout)
  }
}
