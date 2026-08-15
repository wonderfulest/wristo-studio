import { describe, expect, it } from 'vitest'
import { normalizeLayerName, resolveLayerName } from './layerName'

describe('layer name', () => {
  it('trims a custom layer name before persistence', () => {
    expect(normalizeLayerName('  Main time  ')).toBe('Main time')
  })

  it('removes an empty custom name so the type label is used', () => {
    expect(normalizeLayerName('   ')).toBeUndefined()
    expect(resolveLayerName('   ', 'Time')).toBe('Time')
  })

  it('prefers a persisted custom name over the type label', () => {
    expect(resolveLayerName('Hero time', 'Time')).toBe('Hero time')
  })
})
