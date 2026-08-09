import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getDataCatalog } from '@/api/data-catalog'
import type { DataCatalogSnapshot } from '@/types/dataCatalog'
import { getDataTypePropertyOptions, useDataCatalogStore, validateDataCatalog } from './dataCatalogStore'

vi.mock('@/api/data-catalog', () => ({
  getDataCatalog: vi.fn()
}))

const mockedGetDataCatalog = vi.mocked(getDataCatalog)

const validCatalog = (catalogVersion = 12): DataCatalogSnapshot => ({
  catalogVersion,
  dataTypeOptions: [
    {
      valueCode: 0,
      metricSymbol: ':FIELD_TYPE_HEART_RATE',
      category: 'field',
      settingsLabel: { eng: 'Heart Rate', zhs: '心率' },
      label: { eng: 'HR', zhs: '心率' },
      unitKey: 'heart_rate',
      iconUnicode: '0061',
      defaultValue: '0',
      isActive: 1,
      sortOrder: 10,
      dialMode: null,
      dialMin: null,
      dialMax: null,
      dialGoalSource: null
    }
  ],
  unitDefinitions: [
    {
      unitKey: 'heart_rate',
      name: 'Heart rate',
      defaultVariant: 'bpm',
      selectionPolicy: { type: 'fixed', variant: 'bpm' },
      variants: {
        bpm: { aliases: ['bpm'], label: { eng: 'bpm', zhs: '次/分' } }
      },
      isActive: 1,
      sortOrder: 10,
      description: null
    }
  ]
})

const clone = <T>(value: T): T => structuredClone(value)

describe('data catalog store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedGetDataCatalog.mockReset()
  })

  it('replaces items and indexes atomically after strict validation', async () => {
    mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: validCatalog() })

    const store = useDataCatalogStore()
    await store.load()

    expect(store.catalogVersion).toBe(12)
    expect(store.options[0].settingsLabel).toEqual({ eng: 'Heart Rate', zhs: '心率' })
    expect(store.unitsByKey.get('heart_rate')?.defaultVariant).toBe('bpm')
    expect(store.aliasOwners.get('bpm')).toEqual({ unitKey: 'heart_rate', variantKey: 'bpm' })
    expect(store.snapshot?.optionsByValueCode.get(0)?.metricSymbol).toBe(':FIELD_TYPE_HEART_RATE')
    expect(store.snapshot?.optionsByMetricSymbol.get(':FIELD_TYPE_HEART_RATE')?.valueCode).toBe(0)
    expect(() => (store.snapshot?.optionsByValueCode as any).set(1, {})).toThrow()
    expect(getDataTypePropertyOptions()).toEqual([
      expect.objectContaining({
        value: 0,
        metricSymbol: ':FIELD_TYPE_HEART_RATE',
        label: 'HR',
        unitKey: 'heart_rate'
      })
    ])
  })

  it('accepts canonical data types that do not have an icon glyph', () => {
    const catalog = validCatalog()
    catalog.dataTypeOptions[0].iconUnicode = ''

    const snapshot = validateDataCatalog(catalog)

    expect(snapshot.optionsByValueCode.get(0)?.iconUnicode).toBe('')
  })

  it('keeps the last valid snapshot when refresh is incomplete', async () => {
    mockedGetDataCatalog.mockResolvedValueOnce({ code: 0, msg: 'ok', data: validCatalog(12) })
    const store = useDataCatalogStore()
    await store.load()
    const invalid: any = clone(validCatalog(13))
    invalid.dataTypeOptions[0].label.zhs = ''
    mockedGetDataCatalog.mockResolvedValueOnce({ code: 0, msg: 'ok', data: invalid })

    await expect(store.load(true)).rejects.toThrow('valueCode 0: label.zhs is required')

    expect(store.catalogVersion).toBe(12)
    expect(store.options[0].label.zhs).toBe('心率')
    expect(getDataTypePropertyOptions()[0].dataLabel.zhs).toBe('心率')
    expect(store.error).toContain('valueCode 0: label.zhs is required')
  })

  it('deduplicates concurrent non-forced loads without exposing a partial snapshot', async () => {
    let resolveRequest!: (value: any) => void
    mockedGetDataCatalog.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      })
    )
    const store = useDataCatalogStore()

    const first = store.load()
    const second = store.load()
    expect(mockedGetDataCatalog).toHaveBeenCalledOnce()
    expect(store.catalogVersion).toBeNull()

    resolveRequest({ code: 0, msg: 'ok', data: validCatalog() })
    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(store.catalogVersion).toBe(12)
  })

  it.each([
    [
      'catalogVersion',
      (catalog: any) => {
        catalog.catalogVersion = 0
      },
      'catalogVersion must be a positive integer'
    ],
    [
      'dataTypeOptions',
      (catalog: any) => {
        catalog.dataTypeOptions = null
      },
      'dataTypeOptions must be an array'
    ],
    [
      'unitDefinitions',
      (catalog: any) => {
        catalog.unitDefinitions = null
      },
      'unitDefinitions must be an array'
    ],
    [
      'valueCode',
      (catalog: any) => {
        catalog.dataTypeOptions[0].valueCode = -1
      },
      'valueCode must be a nonnegative integer'
    ],
    [
      'metricSymbol',
      (catalog: any) => {
        catalog.dataTypeOptions[0].metricSymbol = 'heart_rate'
      },
      'metricSymbol must match'
    ],
    [
      'category',
      (catalog: any) => {
        catalog.dataTypeOptions[0].category = 'legacy'
      },
      'category is unsupported'
    ],
    [
      'settingsLabel.eng',
      (catalog: any) => {
        catalog.dataTypeOptions[0].settingsLabel.eng = ' '
      },
      'settingsLabel.eng is required'
    ],
    [
      'label.zhs',
      (catalog: any) => {
        catalog.dataTypeOptions[0].label.zhs = ''
      },
      'label.zhs is required'
    ],
    [
      'unitKey',
      (catalog: any) => {
        catalog.dataTypeOptions[0].unitKey = 'Heart Rate'
      },
      'unitKey must match'
    ],
    [
      'iconUnicode',
      (catalog: any) => {
        catalog.dataTypeOptions[0].iconUnicode = ''
      },
      'iconUnicode is required'
    ],
    [
      'defaultValue',
      (catalog: any) => {
        delete catalog.dataTypeOptions[0].defaultValue
      },
      'defaultValue is required'
    ],
    [
      'item isActive',
      (catalog: any) => {
        catalog.dataTypeOptions[0].isActive = 0
      },
      'isActive must be 1'
    ],
    [
      'item sortOrder',
      (catalog: any) => {
        catalog.dataTypeOptions[0].sortOrder = -1
      },
      'sortOrder must be a nonnegative integer'
    ],
    [
      'unit name',
      (catalog: any) => {
        catalog.unitDefinitions[0].name = ''
      },
      'name is required'
    ],
    [
      'defaultVariant',
      (catalog: any) => {
        catalog.unitDefinitions[0].defaultVariant = 'missing'
      },
      "defaultVariant 'missing' is not defined"
    ],
    [
      'variants',
      (catalog: any) => {
        catalog.unitDefinitions[0].variants = null
      },
      'variants must be an object'
    ],
    [
      'variant key',
      (catalog: any) => {
        catalog.unitDefinitions[0].variants['BPM'] = catalog.unitDefinitions[0].variants.bpm
        delete catalog.unitDefinitions[0].variants.bpm
      },
      'variantKey must match'
    ],
    [
      'aliases',
      (catalog: any) => {
        catalog.unitDefinitions[0].variants.bpm.aliases = []
      },
      'aliases must be a non-empty array'
    ],
    [
      'unit label eng',
      (catalog: any) => {
        catalog.unitDefinitions[0].variants.bpm.label.eng = ''
      },
      'label.eng is required'
    ],
    [
      'unit isActive',
      (catalog: any) => {
        catalog.unitDefinitions[0].isActive = 0
      },
      'isActive must be 1'
    ],
    [
      'unit sortOrder',
      (catalog: any) => {
        catalog.unitDefinitions[0].sortOrder = 1.5
      },
      'sortOrder must be a nonnegative integer'
    ]
  ])('rejects invalid required %s', async (_name, mutate, message) => {
    const catalog: any = clone(validCatalog())
    mutate(catalog)
    mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: catalog })

    await expect(useDataCatalogStore().load()).rejects.toThrow(message)
  })

  it('rejects duplicate value codes, symbols, unit keys and normalized aliases', async () => {
    const cases: Array<[string, (catalog: any) => void]> = [
      ['duplicate valueCode 0', (catalog) => catalog.dataTypeOptions.push(clone(catalog.dataTypeOptions[0]))],
      [
        'duplicate metricSymbol :FIELD_TYPE_HEART_RATE',
        (catalog) => {
          const option = clone(catalog.dataTypeOptions[0])
          option.valueCode = 1
          catalog.dataTypeOptions.push(option)
        }
      ],
      ["duplicate unitKey 'heart_rate'", (catalog) => catalog.unitDefinitions.push(clone(catalog.unitDefinitions[0]))],
      [
        "alias 'bpm' is owned by",
        (catalog) => {
          catalog.unitDefinitions.push({
            ...clone(catalog.unitDefinitions[0]),
            unitKey: 'cadence',
            name: 'Cadence',
            defaultVariant: 'rpm',
            variants: { rpm: { aliases: [' BPM '], label: { eng: 'rpm', zhs: '转/分' } } }
          })
        }
      ]
    ]

    for (const [message, mutate] of cases) {
      const catalog: any = clone(validCatalog())
      mutate(catalog)
      mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: catalog })
      await expect(useDataCatalogStore().load(true)).rejects.toThrow(message)
    }
  })

  it('rejects a normalized alias repeated inside the same variant', async () => {
    const catalog: any = clone(validCatalog())
    catalog.unitDefinitions[0].variants.bpm.aliases.push(' BPM ')
    mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: catalog })

    await expect(useDataCatalogStore().load()).rejects.toThrow("duplicate alias 'bpm'")
  })

  it.each([
    [
      'none default variant',
      (catalog: any) => {
        catalog.unitDefinitions[0].unitKey = 'none'
      },
      'unitDefinitions[0].defaultVariant must be null for unitKey none'
    ],
    [
      'none variants',
      (catalog: any) => {
        catalog.unitDefinitions[0].unitKey = 'none'
        catalog.unitDefinitions[0].defaultVariant = null
      },
      'unitDefinitions[0].variants must be empty for unitKey none'
    ],
    [
      'active non-none variants',
      (catalog: any) => {
        catalog.unitDefinitions[0].variants = {}
        catalog.unitDefinitions[0].defaultVariant = null
      },
      'unitDefinitions[0].variants must contain at least one variant for active unit heart_rate'
    ],
    [
      'active non-none default',
      (catalog: any) => {
        catalog.unitDefinitions[0].defaultVariant = null
      },
      'unitDefinitions[0].defaultVariant is required for active unit heart_rate'
    ],
    [
      'active non-none default key',
      (catalog: any) => {
        catalog.unitDefinitions[0].defaultVariant = ' BPM '
      },
      'unitDefinitions[0].defaultVariant must match ^[a-z][a-z0-9_]*$'
    ]
  ])('enforces the strict %s rule with an exact path', async (_name, mutate, message) => {
    const catalog: any = clone(validCatalog())
    mutate(catalog)
    mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: catalog })

    await expect(useDataCatalogStore().load()).rejects.toThrow(message)
  })

  it('rejects missing and inactive unit references and malformed API result shapes', async () => {
    const missing: any = clone(validCatalog())
    missing.dataTypeOptions[0].unitKey = 'missing'
    mockedGetDataCatalog.mockResolvedValueOnce({ code: 0, msg: 'ok', data: missing })
    await expect(useDataCatalogStore().load()).rejects.toThrow("unitKey 'missing' does not reference an active unit")

    mockedGetDataCatalog.mockResolvedValueOnce({ code: 0, msg: 'ok' })
    await expect(useDataCatalogStore().load(true)).rejects.toThrow('catalog response data is required')
  })

  it('requires defaultVariant to be an own variant key and safely supports constructor', async () => {
    const inheritedToString: any = clone(validCatalog())
    inheritedToString.unitDefinitions[0].defaultVariant = 'toString'
    mockedGetDataCatalog.mockResolvedValueOnce({ code: 0, msg: 'ok', data: inheritedToString })
    await expect(useDataCatalogStore().load()).rejects.toThrow(
      'unitDefinitions[0].defaultVariant must match ^[a-z][a-z0-9_]*$',
    )

    const inheritedConstructor: any = clone(validCatalog())
    inheritedConstructor.unitDefinitions[0].defaultVariant = 'constructor'
    mockedGetDataCatalog.mockResolvedValueOnce({ code: 0, msg: 'ok', data: inheritedConstructor })
    await expect(useDataCatalogStore().load(true)).rejects.toThrow(
      "unitDefinitions[0].defaultVariant 'constructor' is not defined",
    )

    const ownConstructor: any = clone(validCatalog(13))
    ownConstructor.unitDefinitions[0].defaultVariant = 'constructor'
    ownConstructor.unitDefinitions[0].selectionPolicy = { type: 'fixed', variant: 'constructor' }
    ownConstructor.unitDefinitions[0].variants = {
      constructor: {
        aliases: ['ctor'],
        label: { eng: 'constructor', zhs: '构造器' },
      },
    }
    mockedGetDataCatalog.mockResolvedValueOnce({ code: 0, msg: 'ok', data: ownConstructor })

    await expect(useDataCatalogStore().load(true)).resolves.toBeDefined()
    expect(useDataCatalogStore().unitsByKey.get('heart_rate')?.variants['constructor'].label.eng).toBe('constructor')
  })

  it('publishes a deeply immutable snapshot and readonly lookup facades', async () => {
    mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: validCatalog() })
    const store = useDataCatalogStore()
    await store.load()

    expect(Object.isFrozen(store.options)).toBe(true)
    expect(Object.isFrozen(store.options[0])).toBe(true)
    expect(Object.isFrozen(store.options[0].label)).toBe(true)
    const unit = store.unitsByKey.get('heart_rate')!
    expect(Object.getPrototypeOf(unit.variants)).toBeNull()
    expect(Object.isFrozen(unit.variants)).toBe(true)
    expect(Object.isFrozen(unit.variants.bpm.aliases)).toBe(true)
    expect((store.unitsByKey as any).set).toBeUndefined()
    expect((store.aliasOwners as any).delete).toBeUndefined()

    expect(() => ((store.options[0].label as any).eng = 'mutated')).toThrow()
    expect(() => (unit.variants.bpm.aliases as any).push('mutated')).toThrow()
    expect(store.options[0].label.eng).toBe('HR')
    expect(store.unitsByKey.get('heart_rate')?.variants.bpm.aliases).toEqual(['bpm'])
  })

  it('normalizes canonical text and aliases without mutating the API response', async () => {
    const response: any = validCatalog()
    response.dataTypeOptions[0].metricSymbol = '  :FIELD_TYPE_HEART_RATE  '
    response.dataTypeOptions[0].category = '  field  '
    response.dataTypeOptions[0].settingsLabel = { eng: ' Heart Rate ', zhs: ' 心率 ' }
    response.dataTypeOptions[0].label = { eng: ' HR ', zhs: ' 心率 ' }
    response.dataTypeOptions[0].unitKey = ' heart_rate '
    response.dataTypeOptions[0].iconUnicode = ' 0061 '
    response.dataTypeOptions[0].defaultValue = ' 0 '
    response.unitDefinitions[0].unitKey = ' heart_rate '
    response.unitDefinitions[0].name = ' Heart rate '
    response.unitDefinitions[0].defaultVariant = ' bpm '
    response.unitDefinitions[0].variants.bpm.aliases = [' BPM ', ' Beats/Min ']
    response.unitDefinitions[0].variants.bpm.label = { eng: ' bpm ', zhs: ' 次/分 ' }
    const original = clone(response)
    mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: response })

    const store = useDataCatalogStore()
    await store.load()

    expect(store.options[0]).toEqual(expect.objectContaining({
      metricSymbol: ':FIELD_TYPE_HEART_RATE',
      category: 'field',
      unitKey: 'heart_rate',
      iconUnicode: '0061',
      defaultValue: '0',
      settingsLabel: { eng: 'Heart Rate', zhs: '心率' },
      label: { eng: 'HR', zhs: '心率' },
    }))
    expect(store.unitsByKey.get('heart_rate')?.defaultVariant).toBe('bpm')
    expect(store.unitsByKey.get('heart_rate')?.variants.bpm.aliases).toEqual(['bpm', 'beats/min'])
    expect(response).toEqual(original)
  })

  it('trims keys but never lowercases them implicitly', async () => {
    const response: any = validCatalog()
    response.unitDefinitions[0].unitKey = ' Heart_Rate '
    mockedGetDataCatalog.mockResolvedValue({ code: 0, msg: 'ok', data: response })

    await expect(useDataCatalogStore().load()).rejects.toThrow(
      'unitDefinitions[0].unitKey must match ^[a-z][a-z0-9_]*$',
    )
  })
})
