import JSZip from 'jszip'
import { afterEach, vi, describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import {
  appendCopiedDynamicImageItems,
  extractDynamicImageGroups,
  loadCopyableDynamicImageGroups,
} from './dynamicImage.copyModel'

describe('dynamic image group copying', () => {
  it('extracts only non-empty dynamic image groups and gives unnamed groups stable labels', () => {
    const groups = extractDynamicImageGroups({
      elements: [
        { eleType: 'text', id: 'text-1' },
        {
          eleType: 'dynamicImage',
          id: 'dynamic-1',
          layerName: 'Weather states',
          items: [{ id: 'rule-1', imageUrl: '/sun.png', expression: { source: 'weather == 1' } }],
        },
        { eleType: 'dynamicImage', id: 'dynamic-empty', items: [] },
        {
          eleType: 'dynamicImage',
          id: 'dynamic-2',
          items: [{ id: 'rule-2', imageUrl: '/moon.png', expression: { source: 'false' } }],
        },
      ],
    })

    expect(groups.map(group => ({ id: group.id, label: group.label, count: group.items.length }))).toEqual([
      { id: 'dynamic-1', label: 'Weather states', count: 1 },
      { id: 'dynamic-2', label: 'Dynamic image group 2', count: 1 },
    ])
  })

  it('accepts a JSON string config and rejects malformed configs without throwing', () => {
    expect(extractDynamicImageGroups(JSON.stringify({
      elements: [{
        eleType: 'dynamicImage',
        id: 'dynamic-1',
        items: [{ id: 'rule-1', imageUrl: '/sun.png', expression: { source: 'true' } }],
      }],
    }))).toHaveLength(1)
    expect(extractDynamicImageGroups('{invalid')).toEqual([])
    expect(extractDynamicImageGroups(null)).toEqual([])
  })

  it('appends cloned rules and regenerates every copied id', () => {
    const existing = [{
      id: 'current-rule',
      imageUrl: '/current.png',
      assetId: 10,
      expression: { source: 'true', ast: { type: 'literal', value: true } },
    }] as any
    const source = [{
      id: 'source-rule',
      imageUrl: '/source.png',
      assetId: 20,
      expression: { source: 'false', ast: { type: 'literal', value: false } },
    }] as any

    const result = appendCopiedDynamicImageItems(existing, source, () => 'new-rule-id')

    expect(result).toEqual([
      existing[0],
      { ...source[0], id: 'new-rule-id' },
    ])
    expect(result[1]).not.toBe(source[0])
    expect(result[1].expression).not.toBe(source[0].expression)
  })

  it('copies rules received as Vue reactive proxies', () => {
    const source = reactive([{
      id: 'source-rule',
      imageUrl: '/source.png',
      expression: { source: 'false', ast: { type: 'literal', value: false } },
    }]) as any

    expect(() => appendCopiedDynamicImageItems([], source, () => 'copied-rule')).not.toThrow()
    expect(appendCopiedDynamicImageItems([], source, () => 'copied-rule')[0]).toEqual({
      id: 'copied-rule',
      imageUrl: '/source.png',
      expression: { source: 'false', ast: { type: 'literal', value: false } },
    })
  })
})


describe('packaged dynamic image group copying', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it.each(['', '123-watch/'])('restores embedded images from a %s package without mutating the current project', async (root) => {
    const zip = new JSZip()
    const config = { elements: [{ eleType: 'dynamicImage', id: 'group', items: [
      { id: 'rule', imageUrl: 'bundle://assets/sun.svg', minProgress: 0.5 },
    ] }] }
    zip.file(root + 'manifest.json', JSON.stringify({ design: { path: 'design.json' }, studio: { assetRefs: [] } }))
    zip.file(root + 'design.json', JSON.stringify(config))
    zip.file(root + 'assets/sun.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>')
    const bytes = await zip.generateAsync({ type: 'arraybuffer' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes }))
    const groups = await loadCopyableDynamicImageGroups({}, 'https://cdn.wristo.io/project.wrt')
    expect(groups[0].items[0].imageUrl).toBe('data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg"/>'))
    expect(groups[0].items[0].minProgress).toBe(0.5)
    expect(config.elements[0].items[0].imageUrl).toBe('bundle://assets/sun.svg')
  })

  it('restores old blob references through the manifest and rejects missing files', async () => {
    const zip = new JSZip()
    const config = { elements: [{ eleType: 'dynamicImage', items: [{ id: 'rule', imageUrl: 'blob:old-session' }] }] }
    zip.file('manifest.json', JSON.stringify({ studio: { assetRefs: [{ path: 'assets/sun.png', sourceUrl: 'blob:old-session' }] } }))
    zip.file('assets/sun.png', 'image-bytes')
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({ ok: true, arrayBuffer: () => zip.generateAsync({ type: 'arraybuffer' }) })))
    const groups = await loadCopyableDynamicImageGroups(config, '/legacy.zip')
    expect(groups[0].items[0].imageUrl).toBe('data:image/png;base64,' + btoa('image-bytes'))
    expect(config.elements[0].items[0].imageUrl).toBe('blob:old-session')
    zip.remove('assets/sun.png')
    await expect(loadCopyableDynamicImageGroups(config, '/legacy.zip')).rejects.toThrow('Source design image is missing')
  })

  it('keeps legacy public URLs when there is no package', async () => {
    const config = { elements: [{ eleType: 'dynamicImage', items: [{ id: 'rule', imageUrl: 'https://cdn.wristo.io/sun.png' }] }] }
    expect(await loadCopyableDynamicImageGroups(config)).toEqual(extractDynamicImageGroups(config))
  })

  it('rejects unresolved package references instead of offering broken images', async () => {
    await expect(loadCopyableDynamicImageGroups({ elements: [{ eleType: 'dynamicImage', items: [{ imageUrl: 'bundle://missing.png' }] }] })).rejects.toThrow()
  })
})
