export type LauncherPlatform = 'mac' | 'windows'
export type LauncherArchitecture = 'arm64' | 'x64' | 'universal'

export interface LauncherEnv {
  VITE_CONNECT_IQ_LAUNCHER_MAC_URL?: string
  VITE_CONNECT_IQ_LAUNCHER_MAC_VERSION?: string
  VITE_CONNECT_IQ_LAUNCHER_MAC_SHA256?: string
  VITE_CONNECT_IQ_LAUNCHER_MAC_REQUIREMENTS?: string
  VITE_CONNECT_IQ_LAUNCHER_WINDOWS_URL?: string
  VITE_CONNECT_IQ_LAUNCHER_WINDOWS_VERSION?: string
  VITE_CONNECT_IQ_LAUNCHER_WINDOWS_SHA256?: string
  VITE_CONNECT_IQ_LAUNCHER_WINDOWS_REQUIREMENTS?: string
}

export interface LauncherRelease {
  platform: LauncherPlatform
  architecture?: LauncherArchitecture
  available: boolean
  url: string | null
  version: string | null
  sha256: string | null
  requirements: string | null
}

const DEFAULT_MAC_RELEASE = {
  url: 'https://cdn.wristo.io/launcher/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg',
  version: '0.1.0',
  sha256: 'e9a3651764be5cda7ea1dba706400864915c35387fd831f2456660aaa5977ff4',
  requirements: 'macOS 11 or later · Apple Silicon'
} as const

const optionalText = (value: string | undefined): string | null => value?.trim() || null
const configuredValue = (value: string | undefined, fallback: string): string => value === undefined ? fallback : value

const httpsUrl = (value: string | undefined): string | null => {
  const normalized = optionalText(value)
  if (!normalized) return null
  try {
    const parsed = new URL(normalized)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

const release = (platform: LauncherPlatform, url: string | undefined, version: string | undefined, sha256: string | undefined, requirements: string | undefined): LauncherRelease => {
  const normalizedUrl = httpsUrl(url)
  return {
    platform,
    available: normalizedUrl !== null,
    url: normalizedUrl,
    version: optionalText(version),
    sha256: optionalText(sha256),
    requirements: optionalText(requirements)
  }
}

export const detectLauncherPlatform = (platform: string): LauncherPlatform => (/win/i.test(platform) ? 'windows' : 'mac')

export const getLauncherReleases = (env?: LauncherEnv): Record<LauncherPlatform, LauncherRelease> => {
  const source = env ?? (import.meta.env as unknown as LauncherEnv)
  return {
    mac: {
      ...release(
        'mac',
        configuredValue(source.VITE_CONNECT_IQ_LAUNCHER_MAC_URL, DEFAULT_MAC_RELEASE.url),
        configuredValue(source.VITE_CONNECT_IQ_LAUNCHER_MAC_VERSION, DEFAULT_MAC_RELEASE.version),
        configuredValue(source.VITE_CONNECT_IQ_LAUNCHER_MAC_SHA256, DEFAULT_MAC_RELEASE.sha256),
        configuredValue(source.VITE_CONNECT_IQ_LAUNCHER_MAC_REQUIREMENTS, DEFAULT_MAC_RELEASE.requirements)
      ),
      architecture: 'arm64'
    },
    windows: release(
      'windows',
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_URL,
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_VERSION,
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_SHA256,
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_REQUIREMENTS
    )
  }
}
