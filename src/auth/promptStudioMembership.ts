import { MEMBERSHIP_URL } from './studioAccess'

export async function promptStudioMembership(options: {
  confirm: () => Promise<unknown>
  navigate: (url: string) => void
  onCancel: () => void
}) {
  try {
    await options.confirm()
  } catch {
    options.onCancel()
    return
  }
  options.navigate(MEMBERSHIP_URL)
}
