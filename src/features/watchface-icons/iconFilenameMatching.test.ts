import { describe, expect, it } from 'vitest'
import { matchIconFilename } from './iconFilenameMatching'
import type { DataTypeOption } from '@/types/dataCatalog'
import type { WatchfaceIcon } from './watchfaceIcons'
const option = (symbol: string, unicode: string, zh = symbol) => ({ metricSymbol: `:FIELD_TYPE_${symbol}`, iconUnicode: unicode, settingsLabel: { eng: symbol, zhs: zh } }) as DataTypeOption
const options = [
  option('STEPS', '0061', '步数'),
  option('RESPIRATION_RATE', '0062'),
  option('DAYLY_ACTIVE_MINUTES', '0063'),
  option('TEMPERATURE', '0064'),
  option('TEMPERATURE_HIGH', '0065'),
  option('SPO2', '0066')
]
const icons: WatchfaceIcon[] = options.map((o) => ({ key: `wristo-icon::${o.iconUnicode}`, fontSlug: 'wristo-icon', unicode: o.iconUnicode, label: o.settingsLabel.zhs, elements: [] }))
describe('filename matching', () => {
  it.each([
    ['STEPS.PNG', '0061'],
    ['步数.svg', '0061'],
    ['breathing.png', '0062'],
    ['Active_Minutes.svg', '0063'],
    ['temperature.png', '0064'],
    ['blood oxygen.png', '0066']
  ])('matches %s without fuzzy cross-matching', (file, unicode) => {
    expect(matchIconFilename(file, icons, options).map((i) => i.unicode)).toEqual([unicode])
  })
  it('leaves unknown names unmatched', () => expect(matchIconFilename('something.png', icons, options)).toEqual([]))
  it('exposes ambiguity across fonts rather than choosing one', () => {
    expect(matchIconFilename('steps.png', [...icons, { ...icons[0], key: 'other::0061', fontSlug: 'other' }], options)).toHaveLength(2)
  })
  it('deduplicates catalog options sharing the same glyph and excludes custom icons', () => {
    expect(matchIconFilename('steps.png', [...icons, { ...icons[0], key: 'custom', custom: true }], [...options, options[0]])).toHaveLength(1)
  })
})
