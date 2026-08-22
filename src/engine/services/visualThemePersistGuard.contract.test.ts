import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type PersistingRendererContract = {
  renderer: string
  plugins: string[]
}

const contracts: PersistingRendererContract[] = [
  { renderer: 'data/data/data', plugins: ['data/data/data'] },
  { renderer: 'data/icon/icon', plugins: ['data/icon/icon'] },
  { renderer: 'data/label/label', plugins: ['data/label/label'] },
  { renderer: 'data/unit/unit', plugins: ['data/unit/unit'] },
  { renderer: 'decoration/image/image', plugins: ['decoration/image/image'] },
  { renderer: 'goal/goalArc/goalArc', plugins: ['goal/goalArc/goalArc'] },
  { renderer: 'goal/goalBar/goalBar', plugins: ['goal/goalBar/goalBar'] },
  {
    renderer: 'hands/common/hand',
    plugins: ['hands/hourHand/hourHand', 'hands/minuteHand/minuteHand', 'hands/secondHand/secondHand'],
  },
  {
    renderer: 'indicators/common/indicatorText',
    plugins: [
      'indicators/alarms/alarms',
      'indicators/bluetooth/bluetooth',
      'indicators/disturb/disturb',
      'indicators/notification/notification',
    ],
  },
  { renderer: 'metric/zoneMetric/zoneMetric', plugins: ['metric/zoneMetric/zoneMetric'] },
  { renderer: 'shapes/circle/circle', plugins: ['shapes/circle/circle'] },
  { renderer: 'shapes/line/line', plugins: ['shapes/line/line'] },
  { renderer: 'shapes/polygon/polygon', plugins: ['shapes/polygon/polygon'] },
  { renderer: 'shapes/rectangle/rectangle', plugins: ['shapes/rectangle/rectangle'] },
  { renderer: 'time/date/date', plugins: ['time/date/date'] },
  { renderer: 'time/time/time', plugins: ['time/time/time'] },
]

function readElementSource(relativePath: string, suffix: 'renderer' | 'plugin') {
  return readFileSync(new URL(`../../elements/${relativePath}.${suffix}.ts`, import.meta.url), 'utf8')
}

describe('visual theme renderer persistence contract', () => {
  it.each(contracts)('$renderer guards update-time element data writes', ({ renderer }) => {
    const source = readElementSource(renderer, 'renderer')
    expect(source).toMatch(/context\.persist\s*(?:===|!==)\s*false/)
  })

  it.each(contracts.flatMap(({ renderer, plugins }) =>
    plugins.map((plugin) => ({ renderer, plugin }))))(
    '$plugin forwards update context to $renderer',
    ({ plugin }) => {
      const source = readElementSource(plugin, 'plugin')
      expect(source).toMatch(/update:\s*\(element,\s*patch,\s*context\)/)
      expect(source).toMatch(/update[A-Za-z]*\([^)]*\bcontext\b/)
    },
  )
})
