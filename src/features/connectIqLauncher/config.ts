export type LauncherPlatform = 'mac' | 'windows'

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
  available: boolean
  url: string | null
  version: string | null
  sha256: string | null
  requirements: string | null
}

const optionalText = (value: string | undefined): string | null => value?.trim() || null

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

const release = (
  platform: LauncherPlatform,
  url: string | undefined,
  version: string | undefined,
  sha256: string | undefined,
  requirements: string | undefined,
): LauncherRelease => {
  const normalizedUrl = httpsUrl(url)
  return {
    platform,
    available: normalizedUrl !== null,
    url: normalizedUrl,
    version: optionalText(version),
    sha256: optionalText(sha256),
    requirements: optionalText(requirements),
  }
}

export const detectLauncherPlatform = (platform: string): LauncherPlatform =>
  /win/i.test(platform) ? 'windows' : 'mac'

export const getLauncherReleases = (env?: LauncherEnv): Record<LauncherPlatform, LauncherRelease> => {
  const source = env ?? (import.meta.env as unknown as LauncherEnv)
  return {
    mac: release(
    'mac',
      source.VITE_CONNECT_IQ_LAUNCHER_MAC_URL,
      source.VITE_CONNECT_IQ_LAUNCHER_MAC_VERSION,
      source.VITE_CONNECT_IQ_LAUNCHER_MAC_SHA256,
      source.VITE_CONNECT_IQ_LAUNCHER_MAC_REQUIREMENTS,
    ),
    windows: release(
      'windows',
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_URL,
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_VERSION,
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_SHA256,
      source.VITE_CONNECT_IQ_LAUNCHER_WINDOWS_REQUIREMENTS,
    ),
  }
}
