import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Tick color settings integration', () => {
  it.each(['../tick12/tick12.panel.vue', '../tick60/tick60.panel.vue'])(
    'renders shared settings in %s',
    (path) => {
      const source = readSource(path)
      expect(source).toContain("import TickColorSettings from '@/elements/dials/common/TickColorSettings.vue'")
      expect(source).toContain('<TickColorSettings')
    },
  )

  it('does not add dynamic color settings to romans', () => {
    expect(readSource('../romans/romans.panel.vue')).not.toContain('TickColorSettings')
  })

  it('uses one ColorPicker for both static colors and variable bindings', () => {
    const source = readSource('./TickColorSettings.vue')
    expect(source).not.toContain('ColorPropertyField')
    expect(source.match(/<ColorPicker/g)).toHaveLength(1)
    expect(source).toContain('@property-change="handleColorSelection"')
    expect(source).toContain('fill: payload.color')
    expect(source).toContain('fillProperty: payload.propertyKey')
  })

  it('refreshes the tick tint when a theme color variable changes', () => {
    const source = readSource('../../../components/panels/settings/ThemeConfigSettings.vue')
    expect(source).toContain('applyDialColorPreview')
    expect(source).toContain("['tick12', 'tick60'].includes")
  })
})
