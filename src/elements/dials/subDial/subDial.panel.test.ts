import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./subDial.panel.vue', import.meta.url), 'utf8')

describe('subDial panel goal binding', () => {
  it('binds only goalProperty through GoalPropertyField', () => {
    expect(source).toContain("import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'")
    expect(source).toContain(':model-value="model.goalProperty"')
    expect(source).toContain('patch({ goalProperty: $event })')
    expect(source).not.toContain('DataPropertyField')
    expect(source).not.toContain('dataProperty')
  })
})
