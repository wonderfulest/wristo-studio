import { describe, expect, it } from 'vitest'
import { isOlderBuildVersion } from './buildVersion'

describe('build version comparison', () => {
  it.each([
    ['2.9.4', '2.9.5', true],
    ['2.9.4', '2.10.0', true],
    ['v2.9.4', 'v3.0.0', true],
    ['2.9.4', '2.9.4', false],
    ['2.10.0', '2.9.4', false],
    [null, '2.9.4', false],
    ['2.9.4', null, false],
    ['unknown', '2.9.4', false],
    ['2.9.5-beta', '2.9.5', false],
  ])('%s compared with %s', (current, latest, expected) => {
    expect(isOlderBuildVersion(current, latest)).toBe(expected)
  })
})
