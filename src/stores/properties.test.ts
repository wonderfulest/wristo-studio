// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePropertiesStore } from './properties'

describe('Dial Properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns only properties matching the requested Dial mode', () => {
    const store = usePropertiesStore()
    store.addProperty({ key: 'dial_goal_1', type: 'dial', dialMode: 'goal', title: 'Steps', options: [] })
    store.addProperty({ key: 'dial_range_1', type: 'dial', dialMode: 'range', title: 'Battery', options: [] })

    expect(store.getDialProperties('goal').map(([key]) => key)).toEqual(['dial_goal_1'])
    expect(store.getDialProperties('range').map(([key]) => key)).toEqual(['dial_range_1'])
  })

  it('does not change the mode of an existing Dial Property', () => {
    const store = usePropertiesStore()
    store.addProperty({ key: 'dial_goal_1', type: 'dial', dialMode: 'goal', title: 'Steps', options: [] })

    store.editProperty('dial_goal_1', { dialMode: 'range' })

    expect(store.allProperties.dial_goal_1.dialMode).toBe('goal')
  })

  it('clears blank-design properties and defaults text case to uppercase', () => {
    const store = usePropertiesStore()
    store.addProperty({ key: 'color_1', type: 'color', title: 'Color', defaultValue: '0xFFFFFF', options: [] })
    store.textCase = 2

    store.clearProperties()

    expect(store.allProperties).toEqual({})
    expect(store.textCase).toBe(1)
  })
})
