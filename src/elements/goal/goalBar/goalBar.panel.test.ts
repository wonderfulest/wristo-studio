import { describe, expect, it } from 'vitest'
import source from './goalBar.panel.vue?raw'
import { GOAL_BAR_DIRECTIONS } from './goalBar.direction'

describe('GoalBar direction panel', () => {
  it('offers all four directions and persists only progressDirection', () => {
    expect(GOAL_BAR_DIRECTIONS).toEqual(['leftToRight', 'rightToLeft', 'bottomToTop', 'topToBottom'])
    expect(source).toContain('v-for="direction in GOAL_BAR_DIRECTIONS"')
    expect(source).toContain('applyUpdate({ progressDirection: value })')
    expect(source).not.toContain('setProgressAlign')
  })
})
