import { describe, expect, it } from 'vitest'
import { newProjectConfig } from './newProjectConfig'

describe('new WRT project configuration', () => {
  it('turns the API empty config into an importable project and keeps the selected language', () => {
    expect(newProjectConfig({}, 'new-id', 'My Watch', 'zhs')).toMatchObject({
      designId: 'new-id', name: 'My Watch', elements: [], properties: {}, orderIds: [],
      localization: { appLanguage: 'zhs' },
    })
  })
  it('preserves imported elements and binds them to the new identity', () => {
    const source = { designId: 'old', elements: [{ imageUrl: 'blob:local' }], localization: { dataLabelLength: 8 } }
    expect(newProjectConfig(source, 'new', 'Copy', 'eng')).toMatchObject({
      designId: 'new', elements: source.elements, localization: { appLanguage: 'eng', dataLabelLength: 8 },
    })
    expect(source.designId).toBe('old')
  })
})
