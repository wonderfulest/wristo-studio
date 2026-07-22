import { describe, expect, it } from 'vitest'

import { attemptChunkLoadRecovery, isStaleDynamicImportError } from './chunkLoadRecovery'

describe('isStaleDynamicImportError', () => {
  it('recognizes a Vite dynamic import fetch failure', () => {
    const error = new TypeError(
      'Failed to fetch dynamically imported module: https://studio.wristo.io/assets/Design-df28b9da.js',
    )

    expect(isStaleDynamicImportError(error)).toBe(true)
  })

  it('does not treat an ordinary route error as a stale deployment', () => {
    expect(isStaleDynamicImportError(new Error('Unable to load design data'))).toBe(false)
  })
})

describe('attemptChunkLoadRecovery', () => {
  it('navigates directly to the intended route with a fresh document', () => {
    const values = new Map<string, string>()
    const assignedPaths: string[] = []

    const recovered = attemptChunkLoadRecovery(
      new TypeError('Failed to fetch dynamically imported module: /assets/Design-old.js'),
      '/design?id=design-1',
      {
        now: () => 1_000,
        storage: {
          getItem: (key) => values.get(key) ?? null,
          setItem: (key, value) => values.set(key, value),
        },
        assign: (path) => assignedPaths.push(path),
      },
    )

    expect(recovered).toBe(true)
    expect(assignedPaths).toEqual(['/design?id=design-1'])
  })

  it('does not reload repeatedly when the fresh document has the same chunk failure', () => {
    const assignedPaths: string[] = []
    const storage = {
      getItem: () => '1000',
      setItem: () => undefined,
    }

    const recovered = attemptChunkLoadRecovery(
      new TypeError('Failed to fetch dynamically imported module: /assets/Design-missing.js'),
      '/design?id=design-1',
      { now: () => 2_000, storage, assign: (path) => assignedPaths.push(path) },
    )

    expect(recovered).toBe(false)
    expect(assignedPaths).toEqual([])
  })
})
