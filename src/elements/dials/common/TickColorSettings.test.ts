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

  it('binds both the property key and preview color in the shared component', () => {
    const source = readSource('./TickColorSettings.vue')
    expect(source).toContain('ColorPropertyField')
    expect(source).toContain('ColorPicker')
    expect(source).toContain('resolveDialColorPatch')
    expect(source).toContain('fillProperty')
    expect(source).toContain('fill: color')
  })

  it('refreshes the tick tint when a theme color variable changes', () => {
    const source = readSource('../../../components/panels/settings/ThemeConfigSettings.vue')
    expect(source).toContain('applyDialColorPreview')
    expect(source).toContain("['tick12', 'tick60'].includes")
  })
})
