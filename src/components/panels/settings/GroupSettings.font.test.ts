// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FabricText } from 'fabric'
import { useCanvasStore } from '@/stores/canvasStore'
import { updateText } from '@/elements/texts/text/text.renderer'
import { encodeText, decodeText } from '@/elements/texts/text/text.encoder'

beforeEach(() => { setActivePinia(createPinia()) })

it('persists the selected font for every selected element before recording history', async () => {
  const canvas = { renderAll: vi.fn() }
  useCanvasStore().canvas = canvas as any
  const elements = ['first', 'second'].map(id => Object.assign(new FabricText('Hello', {
    fontFamily: 'old-font', fontSize: 36, left: 20, top: 30,
  }), { id, eleType: 'text', assetFontFamily: 'old-font' }))
  const commitHistory = vi.fn(() => {
    for (const element of elements) {
      const saved = JSON.parse(JSON.stringify(encodeText(element as any)))
      expect(decodeText(saved).fontFamily).toBe('new-font')
    }
  })
  // Execute the component's actual event handler with real text rendering/encoding.
  const source = readFileSync('src/components/panels/settings/GroupSettings.vue', 'utf8')
  const handler = source.match(/const updateFontFamily = ([\s\S]*?)\nconst showDataProperty/)![1]
  const js = ts.transpile(`const handler = ${handler}`, { target: ts.ScriptTarget.ES2022 })
  const updateElement = vi.fn(async (element, patch) => {
    await Promise.resolve()
    updateText(element, patch)
  })
  const run = new Function('props', 'fontFamily', 'elementDataStore', 'baseStore', 'commitHistory', 'elementManager', `${js}; return handler`)(
    { elements }, { value: 'new-font' }, { patchElement: vi.fn() }, { canvas }, commitHistory, { updateElement },
  )
  await run()
  expect(commitHistory).toHaveBeenCalledOnce()
  expect(elements.map(element => encodeText(element as any).fontFamily)).toEqual(['new-font', 'new-font'])
})

it.each([
  ['updateFontSize', 'syncPrimaryColorState', { fontSize: 48, iconSize: 48 }],
  ['updatePrimaryColorBinding', 'updateFontFamily', { fill: '#ff0000', fillProperty: null }],
])('routes %s through each icon renderer before saving history', async (name, next, expectedPatch) => {
  const source = readFileSync('src/components/panels/settings/GroupSettings.vue', 'utf8')
  const handler = source.split(`const ${name} = `)[1].split(`\nconst ${next}`)[0]
  const js = ts.transpile(`const handler = ${handler}`, { target: ts.ScriptTarget.ES2022 })
  const elements = ['first', 'second'].map(id => ({ id, eleType: 'icon', set: vi.fn() }))
  const updateElement = vi.fn(async () => { await Promise.resolve() })
  const commitHistory = vi.fn(() => expect(updateElement).toHaveBeenCalledTimes(2))
  const run = new Function('props', 'fontSize', 'textColor', 'sharedFillProperty', 'buildPrimaryColorBindingPatch', 'elementDataStore', 'baseStore', 'commitHistory', 'elementManager', `${js}; return handler`)(
    { elements }, { value: 48 }, { value: '' }, { value: '' }, () => expectedPatch,
    { patchElement: vi.fn() }, { canvas: { renderAll: vi.fn() } }, commitHistory, { updateElement },
  )
  await run({ color: '#ff0000', propertyKey: null })
  for (const element of elements) expect(updateElement).toHaveBeenCalledWith(element, expectedPatch)
  expect(commitHistory).toHaveBeenCalledOnce()
})

it('keeps icon font selection scoped to the selected elements', () => {
  const source = readFileSync('src/components/panels/settings/GroupSettings.vue', 'utf8')
  expect(source.match(/<font-picker[\s\S]*?\/>/)?.[0]).toContain(':use-global-icon-font-strategy="false"')
})
