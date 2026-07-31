import { describe, expect, it } from 'vitest'
import {
  buildPrimaryColorBindingPatch,
  resolveSharedPrimaryColorBinding,
} from './groupPrimaryColorBinding'

describe('groupPrimaryColorBinding', () => {
  it('keeps a shared property key while reporting mixed colors', () => {
    expect(resolveSharedPrimaryColorBinding([
      { fill: '#111111', fillProperty: 'Accent' },
      { fill: '#222222', fillProperty: 'Accent' },
    ])).toEqual({
      color: '#111111',
      propertyKey: 'Accent',
      mixedColor: true,
      mixedProperty: false,
    })
  })

  it('clears the displayed property key for mixed bindings', () => {
    expect(resolveSharedPrimaryColorBinding([
      { fill: '#111111', fillProperty: 'Accent' },
      { fill: '#222222', fillProperty: 'Warning' },
    ])).toEqual({
      color: '#111111',
      propertyKey: '',
      mixedColor: true,
      mixedProperty: true,
    })
  })

  it('normalizes missing fills and bindings', () => {
    expect(resolveSharedPrimaryColorBinding([{}, {}])).toEqual({
      color: '#FFFFFF',
      propertyKey: '',
      mixedColor: false,
      mixedProperty: false,
    })
  })

  it('builds a variable-binding patch', () => {
    expect(buildPrimaryColorBindingPatch({
      color: '#ABCDEF',
      propertyKey: 'Accent',
    })).toEqual({
      fill: '#ABCDEF',
      fillProperty: 'Accent',
    })
  })

  it('builds an unbound solid-color patch', () => {
    expect(buildPrimaryColorBindingPatch({
      color: '#123456',
      propertyKey: null,
    })).toEqual({
      fill: '#123456',
      fillProperty: null,
    })
  })
})
