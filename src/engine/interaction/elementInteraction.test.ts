import { describe, it, expect } from 'vitest'
import { captureInteraction, followElementSource, interactionTouchBounds, validateElementInteractions, INTERACTION_DEFAULTS } from './elementInteraction'
import { registerElement, encodeElementByRegistry, decodeElementConfig } from '@/engine/registry/elementRegistry'
import type { PropertiesMap } from '@/types/properties'
const bounds = { centerOffsetX: 0, centerOffsetY: 0, width: 80, height: 40 }
const interaction = { ...INTERACTION_DEFAULTS, action: 'complication' as const, bounds }
describe('existing element interactions', () => {
  it('follows only explicit known data mappings, including all dynamic options', () => {
    const properties: PropertiesMap = { data_1: { type: 'data', title: 'Metric', value: ':FIELD_TYPE_HEART_RATE', metricSymbols: [':FIELD_TYPE_HEART_RATE', ':FIELD_TYPE_STEPS'] } }
    const element = { eleType: 'data', dataProperty: 'data_1' }
    expect(followElementSource(element, properties).source).toBe(18)
    properties.data_1.value = ':FIELD_TYPE_STEPS'
    expect(followElementSource(element, properties).source).toBe(2)
    properties.data_1.metricSymbols!.push(':FIELD_TYPE_DISTANCE')
    expect(followElementSource(element, properties)).toMatchObject({ source: 2, unsupported: [':FIELD_TYPE_DISTANCE'] })
    properties.data_1.value = ':FIELD_TYPE_DISTANCE'
    expect(followElementSource(element, properties).source).toBeUndefined()
    expect(validateElementInteractions(properties, [{ ...element, interaction: { ...interaction, target: 'element' } }])).toEqual([])
    expect(followElementSource({ eleType: 'image', imageUrl: 'heart.png' }, {}).source).toBeUndefined()
    expect(followElementSource({ eleType: 'battery' }, {}).source).toBe(1)
  })
  it('does not retain a guessed default when the selected source becomes invalid', () => {
    const properties: PropertiesMap = { goal_1: { type: 'goal', title: 'Goal', value: 2, options: [{ value: 2, label: 'Steps', metricSymbol: ':GOAL_TYPE_STEPS' } as any] } }
    expect(followElementSource({ goalProperty: 'goal_1' }, properties).source).toBe(2)
    properties.goal_1.options!.push({ value: 3, label: 'Calories', metricSymbol: ':GOAL_TYPE_CALORIES' } as any)
    properties.goal_1.value = 3
    expect(followElementSource({ goalProperty: 'goal_1' }, properties).source).toBe(3)
    properties.goal_1.value = 99
    expect(followElementSource({ goalProperty: 'goal_1' }, properties).source).toBeUndefined()
  })
  it('captures transformed canvas bounds against the global origin, not selection-local coordinates', () => {
    const element = { left: -20, top: -30, getXY: () => ({ x: 100, y: 200 }), getBoundingRect: () => ({ left: 90, top: 180, width: 120, height: 70 }), interaction }
    expect(captureInteraction(element)?.bounds).toEqual({ centerOffsetX: 50, centerOffsetY: 15, width: 120, height: 70 })
    expect(interactionTouchBounds(element)).toEqual({ left: 82, top: 172, width: 136, height: 86, shape: 'rectangle' })
    element.interaction = { ...interaction, touchShape: 'circle', touchMode: 'custom', touchWidth: 100, touchHeight: 60, touchOffsetX: 5, touchOffsetY: -10 } as any
    expect(interactionTouchBounds(element)).toEqual({ left: 125, top: 175, width: 60, height: 60, shape: 'circle' })
  })
  it('keeps appearance and interaction separate through shared encode/decode', () => {
    registerElement('interaction-test', { add: () => ({}) as any, encode: () => ({ id: 'test', eleType: 'text', left: 10, top: 20, originX: 'center', originY: 'center', textTemplate: 'Hello', fill: '#fff', fontFamily: 'Arial', fontSize: 36 }) })
    const encoded = encodeElementByRegistry({ eleType: 'interaction-test', interaction } as any)
    expect(encoded?.interaction).toEqual(interaction)
    expect(encoded).toMatchObject({ textTemplate: 'Hello', fill: '#fff', fontSize: 36 })
    expect(validateElementInteractions({}, [encoded as any])).toEqual([])
    registerElement('text', { add: () => ({}) as any })
    expect(decodeElementConfig(encoded!)?.interaction).toEqual(interaction)
  })
  it('validates active targets/bounds but treats None as inert', () => {
    const element = { eleType: 'image', interaction }
    expect(validateElementInteractions({}, [element])).toEqual([])
    for (const patch of [{ complicationType: 43 }, { target: 'property', complicationProperty: 'missing' }, { target: 'element' }, { bounds: undefined }, { touchPadding: -1 }, { touchOffsetY: NaN }, { touchShape: 'oval' }]) {
      expect(validateElementInteractions({}, [{ ...element, interaction: { ...interaction, ...patch } }])).toHaveLength(1)
    }
    expect(validateElementInteractions({}, [{ ...element, interaction: { action: 'none', complicationProperty: 'deleted' } }])).toEqual([])
    expect(validateElementInteractions({}, [{ eleType: 'complication', interaction }])).toHaveLength(1)
  })
})
