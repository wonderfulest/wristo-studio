import { describe, expect, it } from 'vitest'
import {
  buildDynamicImageImportPlan,
  collectDynamicImageImportFiles,
  materializeDynamicImageImportGroups,
  parseDynamicAssetFilename,
  type DynamicImageImportFile,
} from './dynamicImage.quickImport'

const image = (name: string, width = 120, height = 80): DynamicImageImportFile => ({
  name,
  file: new File(['image'], name, { type: 'image/png' }),
  width,
  height,
})

describe('dynamic image quick import naming contract', () => {
  it('maps canonical resource names to the runtime token values', () => {
    expect(parseDynamicAssetFilename('minute-09.png')).toMatchObject({ kind: 'minute', value: 9 })
    expect(parseDynamicAssetFilename('hour24-23.png')).toMatchObject({ kind: 'hour24', value: 23 })
    expect(parseDynamicAssetFilename('hour12-12.png')).toMatchObject({ kind: 'hour12', value: 12 })
    expect(parseDynamicAssetFilename('weekday-01-sun.png')).toMatchObject({ kind: 'weekday', value: 1, label: 'sun' })
    expect(parseDynamicAssetFilename('weather-13-broken-clouds.png')).toMatchObject({ kind: 'weather', value: 13, label: 'broken-clouds' })
    expect(parseDynamicAssetFilename('weather-default.png')).toMatchObject({ kind: 'weather', isDefault: true })
    expect(parseDynamicAssetFilename('Minute_09.png')).toBeNull()
  })

  it('builds sorted mutually exclusive expressions for complete resource groups', () => {
    const files = [
      ...Array.from({ length: 60 }, (_, value) => image(`minute-${String(value).padStart(2, '0')}.png`)),
      ...Array.from({ length: 7 }, (_, index) => image(`weekday-${String(index + 1).padStart(2, '0')}.png`)),
      ...Array.from({ length: 14 }, (_, value) => image(`weather-${String(value).padStart(2, '0')}.png`)),
      image('weather-default.png'),
    ].reverse()

    const plan = buildDynamicImageImportPlan(files)

    expect(plan.errors).toEqual([])
    expect(plan.groups.map((group) => [group.kind, group.tokenCode, group.entries.length])).toEqual([
      ['minute', 'tm8', 60],
      ['weekday', 'tm5', 7],
      ['weather', 'w01', 15],
    ])
    expect(plan.groups[0].entries[0].expression).toBe('(tm8) == 0')
    expect(plan.groups[0].entries[59].expression).toBe('(tm8) == 59')
    expect(plan.groups[2].entries.at(-1)?.expression).toBe('true')
  })

  it('reports unrecognized names, duplicates, missing values, out-of-range values, and size mismatches', () => {
    const plan = buildDynamicImageImportPlan([
      image('minute-00.png'),
      image('minute-00-copy.png'),
      image('minute-60.png'),
      image('minute-01.png', 121, 80),
      image('notes.png'),
    ])

    expect(plan.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unrecognized-name', fileName: 'notes.png' }),
      expect.objectContaining({ code: 'duplicate-value', kind: 'minute', value: 0 }),
      expect.objectContaining({ code: 'out-of-range', kind: 'minute', value: 60 }),
      expect.objectContaining({ code: 'dimension-mismatch', kind: 'minute', fileName: 'minute-01.png' }),
      expect.objectContaining({ code: 'missing-values', kind: 'minute' }),
    ]))
  })

  it('warns when a weather group has no fallback image', () => {
    const files = Array.from({ length: 14 }, (_, value) => image(`weather-${String(value).padStart(2, '0')}.png`))
    expect(buildDynamicImageImportPlan(files).warnings).toContainEqual(
      expect.objectContaining({ code: 'missing-default', kind: 'weather' }),
    )
  })

  it('rejects ZIP archives instead of treating them as quick-import sources', async () => {
    const archive = new File(['zip'], 'minutes.zip', { type: 'application/zip' })

    const result = await collectDynamicImageImportFiles([archive], {
      readDimensions: async () => ({ width: 120, height: 80 }),
    })

    expect(result.files).toEqual([])
    expect(result.errors).toEqual([{ code: 'unsupported-file', fileName: 'minutes.zip' }])
  })

  it('uploads every file before materializing complete dynamic image groups', async () => {
    const files = Array.from({ length: 12 }, (_, index) => image(`hour12-${String(index + 1).padStart(2, '0')}.png`))
    const plan = buildDynamicImageImportPlan(files)
    const uploaded: string[] = []

    const groups = await materializeDynamicImageImportGroups(plan.groups, {
      upload: async (file) => {
        uploaded.push(file.name)
        return { assetId: uploaded.length, imageUrl: `https://cdn.example/${file.name}` }
      },
      createId: (kind, index) => `${kind}-${index}`,
    })

    expect(uploaded).toHaveLength(12)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ kind: 'hour12', width: 120, height: 80 })
    expect(groups[0].items[0]).toMatchObject({ id: 'hour12-0', assetId: 1, imageUrl: 'https://cdn.example/hour12-01.png' })
    expect(groups[0].items[0].expression.source).toBe('(tm7.3) == 1')
  })

  it('does not return partially materialized groups when an upload fails', async () => {
    const files = Array.from({ length: 7 }, (_, index) => image(`weekday-${String(index + 1).padStart(2, '0')}.png`))
    const plan = buildDynamicImageImportPlan(files)
    let attempts = 0

    await expect(materializeDynamicImageImportGroups(plan.groups, {
      upload: async (file) => {
        attempts += 1
        if (attempts === 3) throw new Error(`upload failed: ${file.name}`)
        return { assetId: attempts, imageUrl: `https://cdn.example/${file.name}` }
      },
      createId: (kind, index) => `${kind}-${index}`,
    })).rejects.toThrow('upload failed: weekday-03.png')
  })
})
