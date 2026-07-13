import { describe, expect, it } from 'vitest'
import source from './goalBar.panel.vue?raw'
import { HORIZONTAL_GOAL_BAR_DIRECTIONS, VERTICAL_GOAL_BAR_DIRECTIONS } from './goalBar.direction'

describe('GoalBar direction panel', () => {
  it('places orientation before shape and filters progress directions by axis', () => {
    expect(HORIZONTAL_GOAL_BAR_DIRECTIONS).toEqual(['leftToRight', 'rightToLeft'])
    expect(VERTICAL_GOAL_BAR_DIRECTIONS).toEqual(['bottomToTop', 'topToBottom'])
    expect(source.indexOf("elementSettings.orientation")).toBeLessThan(source.indexOf("elementSettings.shape"))
    expect(source).toContain('v-for="direction in availableProgressDirections"')
    expect(source).toContain('getGoalBarOrientationPatch')
    expect(source).toContain('await applyUpdate(patch)')
    expect(source).not.toContain('setProgressAlign')
  })

  it('renders orientation, shape, and progress direction as accessible icon buttons', () => {
    expect(source).not.toContain('<el-select :model-value="currentOrientation"')
    expect(source).not.toContain(':model-value="currentShape"')
    expect(source).not.toContain(':model-value="currentModel.progressDirection"')
    for (const icon of [
      'mdi:arrow-expand-horizontal',
      'mdi:arrow-expand-vertical',
      'mdi:rectangle-outline',
      'mdi:vector-polygon',
      'mdi:arrow-right',
      'mdi:arrow-left',
      'mdi:arrow-up',
      'mdi:arrow-down',
    ]) {
      expect(source).toContain(icon)
    }
    expect(source).toContain(':aria-pressed=')
    expect(source).toContain(':aria-label=')
    expect(source).toContain(':title=')
  })
})
