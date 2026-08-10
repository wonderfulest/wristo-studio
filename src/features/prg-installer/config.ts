export type PrgInstallerPlatform = 'mac' | 'windows'
export type PrgInstallerArchitecture = 'arm64' | 'x64' | 'universal'

export interface PrgInstallerEnv {
  VITE_PRG_INSTALLER_MAC_URL?: string
  VITE_PRG_INSTALLER_MAC_VERSION?: string
  VITE_PRG_INSTALLER_MAC_SHA256?: string
  VITE_PRG_INSTALLER_MAC_REQUIREMENTS?: string
  VITE_PRG_INSTALLER_WINDOWS_URL?: string
  VITE_PRG_INSTALLER_WINDOWS_VERSION?: string
  VITE_PRG_INSTALLER_WINDOWS_SHA256?: string
  VITE_PRG_INSTALLER_WINDOWS_REQUIREMENTS?: string
}

export interface PrgInstallerRelease {
  platform: PrgInstallerPlatform
  architecture?: PrgInstallerArchitecture
  available: boolean
  url: string | null
  version: string | null
  sha256: string | null
  requirements: string | null
}

const DEFAULT_MAC_RELEASE = {
  url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_macos_arm64.dmg',
  version: '0.1.0',
  sha256: 'e9a3651764be5cda7ea1dba706400864915c35387fd831f2456660aaa5977ff4',
  requirements: 'macOS 11 or later · Apple Silicon'
} as const

export const DEFAULT_WINDOWS_RELEASE = {
  url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64_setup.exe',
  version: '0.1.0',
  sha256: 'a0c75a285938462d71fcc57e1d2e8040b4f00af084029391a1ec7993609fd777',
  requirements: 'Windows 10 or later · x64'
} as const

export const DEFAULT_WINDOWS_MSI_RELEASE = {
  url: 'https://cdn.wristo.io/prg-installer/releases/0.1.0/Wristo_PRG_Installer_0.1.0_windows_x64.msi',
  version: '0.1.0',
  sha256: '28020044a3f6765c4ebac216224552afa032a417fcaefeb4c770d4c8dd60958d',
  requirements: DEFAULT_WINDOWS_RELEASE.requirements
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

const release = (platform: PrgInstallerPlatform, url: string | undefined, version: string | undefined, sha256: string | undefined, requirements: string | undefined): PrgInstallerRelease => {
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

export const detectPrgInstallerPlatform = (platform: string): PrgInstallerPlatform => (/win/i.test(platform) ? 'windows' : 'mac')

export const getPrgInstallerReleases = (env?: PrgInstallerEnv): Record<PrgInstallerPlatform, PrgInstallerRelease> => {
  const source = env ?? (import.meta.env as unknown as PrgInstallerEnv)
  return {
    mac: {
      ...release(
        'mac',
        configuredValue(source.VITE_PRG_INSTALLER_MAC_URL, DEFAULT_MAC_RELEASE.url),
        configuredValue(source.VITE_PRG_INSTALLER_MAC_VERSION, DEFAULT_MAC_RELEASE.version),
        configuredValue(source.VITE_PRG_INSTALLER_MAC_SHA256, DEFAULT_MAC_RELEASE.sha256),
        configuredValue(source.VITE_PRG_INSTALLER_MAC_REQUIREMENTS, DEFAULT_MAC_RELEASE.requirements)
      ),
      architecture: 'arm64'
    },
    windows: release(
      'windows',
      configuredValue(source.VITE_PRG_INSTALLER_WINDOWS_URL, DEFAULT_WINDOWS_RELEASE.url),
      configuredValue(source.VITE_PRG_INSTALLER_WINDOWS_VERSION, DEFAULT_WINDOWS_RELEASE.version),
      configuredValue(source.VITE_PRG_INSTALLER_WINDOWS_SHA256, DEFAULT_WINDOWS_RELEASE.sha256),
      configuredValue(source.VITE_PRG_INSTALLER_WINDOWS_REQUIREMENTS, DEFAULT_WINDOWS_RELEASE.requirements)
    )
  }
}
