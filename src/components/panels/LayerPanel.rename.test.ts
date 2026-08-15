import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(`${process.cwd()}/src/components/panels/LayerPanel.vue`, 'utf8')

describe('LayerPanel rename interaction', () => {
  it('supports inline rename for regular and grouped layer rows', () => {
    expect(source.match(/@dblclick\.stop="startRenaming\(/g)).toHaveLength(2)
    expect(source).toContain('@keydown.enter.prevent="commitLayerName(layer)"')
    expect(source).toContain('@keydown.esc.prevent="cancelRenaming"')
    expect(source).toContain("historyStore.saveState('layer:rename', { captureConfig: true })")
  })
})
