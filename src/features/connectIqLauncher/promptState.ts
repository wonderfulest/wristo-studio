const BUILD_HINT_KEY = 'wristo:connect-iq-launcher:build-hint:v1'

type PromptStorage = Pick<Storage, 'getItem' | 'setItem'>

export const createLauncherPromptState = (storage?: PromptStorage) => {
  let sessionTaken = false

  return {
    takeBuildHint(): boolean {
      if (sessionTaken) return false

      try {
        if (storage?.getItem(BUILD_HINT_KEY) === 'shown') {
          sessionTaken = true
          return false
        }
        storage?.setItem(BUILD_HINT_KEY, 'shown')
      } catch {
        // Private browsing and strict browser policies can block storage.
      }

      sessionTaken = true
      return true
    }
  }
}
