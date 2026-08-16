import { describe, expect, it } from 'vitest'
import { requiresDesignSourceId } from './designSource'

describe('design source metadata', () => {
  it('requires a source id for external catalog platforms', () => {
    expect(requiresDesignSourceId('facer')).toBe(true)
    expect(requiresDesignSourceId('wfb')).toBe(true)
    expect(requiresDesignSourceId('google_play')).toBe(true)
  })

  it('does not require a source id for AI', () => {
    expect(requiresDesignSourceId('ai')).toBe(false)
  })
})
