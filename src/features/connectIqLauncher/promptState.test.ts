import { describe, expect, it } from 'vitest'
import { createLauncherPromptState } from './promptState'

const createMemoryStorage = () => {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

describe('Connect IQ Launcher prompt state', () => {
  it('shows the build hint only once across controllers sharing storage', () => {
    const storage = createMemoryStorage()
    const first = createLauncherPromptState(storage)

    expect(first.takeBuildHint()).toBe(true)
    expect(first.takeBuildHint()).toBe(false)
    expect(createLauncherPromptState(storage).takeBuildHint()).toBe(false)
  })

  it('falls back to once per controller when storage access fails', () => {
    const storage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    }
    const state = createLauncherPromptState(storage)

    expect(state.takeBuildHint()).toBe(true)
    expect(state.takeBuildHint()).toBe(false)
  })
})
