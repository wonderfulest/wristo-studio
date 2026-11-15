import { expect, it } from 'vitest'
import { Rect } from 'fabric'
import { applyFabricCustomProperties } from './fabricProps'
import { encodeIcon } from '@/elements/data/icon/icon.encoder'

it('preserves custom icon identity and image mode in Fabric history and export', () => {
  applyFabricCustomProperties()
  const icon = new Rect({ width: 30, height: 30 })
  Object.assign(icon, { id: 'a', eleType: 'icon', dataProperty: 'data_1', customIconId: 'custom:1', iconDisplayType: 'amoled', amoledImageUrl: '/smile.svg', amoledIconUnicode: '0063', iconSize: 30 })
  const expected = { customIconId: 'custom:1', iconDisplayType: 'amoled', amoledImageUrl: '/smile.svg', amoledIconUnicode: '0063' }
  expect(icon.toObject()).toMatchObject(expected)
  expect(encodeIcon(icon as any)).toMatchObject(expected)
})
