import axios from 'axios'

/** Public, optional metadata: failures must not trigger login redirects or toasts. */
export async function loadAppBuildVersion(): Promise<string | null> {
  try {
    const { data } = await axios.get('/wristo-api/public/platform-versions', {
      timeout: 10000,
      headers: { 'Cache-Control': 'no-cache' },
    })
    const version = data?.data?.connectIqAppBuild?.version
    return data?.code === 0 && typeof version === 'string' && version.trim()
      ? version.trim().replace(/^v(?=\d)/, '')
      : null
  } catch {
    return null
  }
}
