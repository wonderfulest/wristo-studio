import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const editorSettingsSource = readFileSync(new URL('./EditorSettingsDialog.vue', import.meta.url), 'utf8')
const dataOptionsSource = readFileSync(new URL('./ConnectIqDataTypeSelector.vue', import.meta.url), 'utf8')

describe('Editor Settings responsive toolbar', () => {
  it('keeps status, zoom, reset, and the more-settings trigger in the bottom bar', () => {
    const bottomBar = editorSettingsSource.match(/<div class="editor-settings-primary">([\s\S]*?)<el-popover/)?.[1] ?? ''

    expect(bottomBar).toContain('handleZoomOut')
    expect(bottomBar).toContain('zoomPercentLabel')
    expect(bottomBar).toContain('handleZoomIn')
    expect(bottomBar).toContain('handleResetZoom')
    expect(bottomBar).toContain('deviceCodeLabel')
    expect(bottomBar).toContain('selectedElementLabel')
    expect(bottomBar).toContain('canvasSizeLabel')
    expect(bottomBar).toContain('bottom-time-simulator-toggle')
    expect(bottomBar).toContain('showTimeSimulator')
    expect(bottomBar).not.toContain('chineseContentEnabled')
    expect(bottomBar).not.toContain('ConnectIqDataTypeSelector')
    expect(bottomBar).toContain('bottom-device-frame-toggle')
    expect(bottomBar).toContain('showDeviceFrame')
    expect(bottomBar).toContain('bottom-ruler-guides-toggle')
    expect(bottomBar).toContain('showRulerGuides')
  })

  it('never falls back to horizontal overlap or scrolling', () => {
    expect(editorSettingsSource).toContain('overflow: hidden')
    expect(editorSettingsSource).toContain('min-width: 0')
    expect(editorSettingsSource).not.toContain('overflow-x: auto')
  })

  it('moves every non-zoom setting into a grouped upward popover', () => {
    expect(editorSettingsSource).toContain('editor-settings-more-popover')
    expect(editorSettingsSource).toContain('placement="top-end"')
    expect(editorSettingsSource).toContain('more-settings-trigger')
    expect(editorSettingsSource).toContain('more-settings-section')
    expect(editorSettingsSource).toContain("t('editorSettings.previewSection')")
    expect(editorSettingsSource).toContain("t('editorSettings.canvasAidsSection')")
    expect(editorSettingsSource).toContain("t('editorSettings.appearanceSection')")
    expect(editorSettingsSource).toContain('showTimeSimulator')
    expect(editorSettingsSource).toContain('chineseContentEnabled')
    expect(editorSettingsSource).toContain('<ConnectIqDataTypeSelector />')
    expect(editorSettingsSource).toContain('showDeviceFrame')
    expect(editorSettingsSource).toContain('showRulerGuides')
  })

  it('supports an icon-only Data Options trigger', () => {
    expect(dataOptionsSource).toContain('compact?: boolean')
    expect(dataOptionsSource).toContain('v-if="!compact"')
  })
})
