import { describe, expect, it } from 'vitest'
import { resolveCoverImageSaveChoice } from './coverImageSaveChoice'

describe('resolveCoverImageSaveChoice', () => {
  it('updates the cover without prompting when the design has no existing cover', async () => {
    let promptCount = 0
    const choice = await resolveCoverImageSaveChoice(false, async () => {
      promptCount += 1
      return 'keep'
    })

    expect(choice).toBe('update')
    expect(promptCount).toBe(0)
  })

  it.each([
    ['update', 'update'],
    ['keep', 'keep'],
    ['abort', 'abort'],
  ] as const)('returns %s when the user selects %s for an existing cover', async (promptChoice, expected) => {
    const choice = await resolveCoverImageSaveChoice(true, async () => promptChoice)

    expect(choice).toBe(expected)
  })
})
