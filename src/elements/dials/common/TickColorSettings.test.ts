import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Tick asset color integration', () => {
  it.each(['../tick12/tick12.panel.vue', '../tick60/tick60.panel.vue'])(
    'does not render color settings in %s',
    (path) => {
      const source = readSource(path)
      expect(source).not.toContain('TickColorSettings')
      expect(source).not.toContain('ColorPicker')
    },
  )

  it('does not add dynamic color settings to romans', () => {
    expect(readSource('../romans/romans.panel.vue')).not.toContain('TickColorSettings')
  })

  it('keeps uploaded asset colors in the shared renderer', () => {
    const rendererSource = readSource('./dial.renderer.ts')
    expect(rendererSource).not.toContain('applyDialColorPreview')
    expect(rendererSource).not.toContain('supportsDialDynamicColor')
    expect(rendererSource).not.toContain('fillProperty')
  })
})
