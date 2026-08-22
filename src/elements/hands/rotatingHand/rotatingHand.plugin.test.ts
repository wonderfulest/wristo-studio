// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getElementHandler } from '@/engine/registry/elementRegistry'
import registerRotatingHandPlugin from './rotatingHand.plugin'

describe('rotating hand plugin', () => {
  it('registers add, update, encode, and decode handlers', () => {
    registerRotatingHandPlugin()
    const handler = getElementHandler('rotatingHand')
    expect(handler.add).toBeTypeOf('function')
    expect(handler.update).toBeTypeOf('function')
    expect(handler.encode).toBeTypeOf('function')
    expect(handler.decode).toBeTypeOf('function')
  })
})
