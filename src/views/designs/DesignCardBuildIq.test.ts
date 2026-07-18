import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { shouldShowBuildIqButton } from './designCardActions'

const source = readFileSync(new URL('./DesignCard.vue', import.meta.url), 'utf8')

describe('DesignCard Build IQ action', () => {
  it.each([
    ['without a packaging log', {}, true],
    ['after packaging leaves the queue', { packagingLog: { rank: null } }, true],
    ['while packaging', { packagingLog: { rank: 0 } }, false],
    ['while queued', { packagingLog: { rank: 2 } }, false],
  ] as const)('%s', (_label, product, expected) => {
    expect(shouldShowBuildIqButton(product)).toBe(expected)
  })

  it('does not render the action without a product', () => {
    expect(shouldShowBuildIqButton(undefined)).toBe(false)
  })

  it('uses the packaging-only visibility rule in the card', () => {
    expect(source).toContain('shouldShowBuildIqButton(design.value.product)')
    expect(source).not.toContain(':disabled="!!design.product?.packagingLog?.rank"')
  })
})
