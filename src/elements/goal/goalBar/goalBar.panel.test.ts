import { describe, expect, it } from 'vitest'
import source from './goalBar.panel.vue?raw'
import { HORIZONTAL_GOAL_BAR_DIRECTIONS, VERTICAL_GOAL_BAR_DIRECTIONS } from './goalBar.direction'

describe('GoalBar direction panel', () => {
  it('places orientation before shape and filters progress directions by axis', () => {
    expect(HORIZONTAL_GOAL_BAR_DIRECTIONS).toEqual(['leftToRight', 'rightToLeft'])
    expect(VERTICAL_GOAL_BAR_DIRECTIONS).toEqual(['bottomToTop', 'topToBottom'])
    expect(source.indexOf("elementSettings.orientation")).toBeLessThan(source.indexOf("elementSettings.shape"))
    expect(source).toContain('v-for="direction in availableProgressDirections"')
    expect(source).toContain('applyUpdate({ orientation: value, progressDirection })')
    expect(source).not.toContain('setProgressAlign')
  })
})
