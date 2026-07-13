import { describe, expect, it } from 'vitest'
import { resolveSubDialProgress, type SubDialProgressSourceMeta } from './subDial.progress'

const source = (overrides: Partial<SubDialProgressSourceMeta> = {}): SubDialProgressSourceMeta => ({
  value: 25, displayValue: '25', icon: 'steps', label: 'Steps', unit: 'steps', goal: 100, min: 0, max: 100, ...overrides
})

describe('resolveSubDialProgress', () => {
  it('uses only the explicit Goal contract', () => {
    expect(resolveSubDialProgress(source(), { mode: 'goal' })).toMatchObject({ mode: 'goal', percentage: 25, valid: true })
    expect(resolveSubDialProgress(source({ goal: null }), { mode: 'goal' })).toMatchObject({ mode: 'none', percentage: null, valid: false })
  })

  it('uses only backend-provided Range bounds', () => {
    expect(resolveSubDialProgress(source({ value: 60, min: 20, max: 100 }), { mode: 'range' })).toMatchObject({
      mode: 'range', min: 20, max: 100, percentage: 50, valid: true
    })
    expect(resolveSubDialProgress(source({ goal: 100, min: null, max: null }), { mode: 'range' })).toMatchObject({
      mode: 'none', percentage: null, valid: false
    })
  })

  it('does not clamp before the visual out-of-range policy', () => {
    expect(resolveSubDialProgress(source({ value: 150 }), { mode: 'goal' }).percentage).toBe(150)
    expect(resolveSubDialProgress(source({ value: -20 }), { mode: 'range' }).percentage).toBe(-20)
  })
})
