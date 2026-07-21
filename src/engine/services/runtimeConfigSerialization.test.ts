import { describe, expect, it } from 'vitest'
import { isReactive, reactive } from 'vue'

import type { RuntimeDesignConfig } from '@/types/app/config'
import { toPlainRuntimeConfig } from './runtimeConfigSerialization'

describe('toPlainRuntimeConfig', () => {
  it('removes nested Vue proxies so generated configs can be structured-cloned', () => {
    const reactiveProperties = reactive({
      color_1: {
        type: 'color',
        value: '#ffffff',
      },
    })
    const config = {
      version: '1.0',
      properties: reactiveProperties,
      designId: 'design-1',
      name: 'Reactive config',
      elements: [],
      orderIds: [],
    } as unknown as RuntimeDesignConfig

    expect(isReactive(config.properties)).toBe(true)

    const result = toPlainRuntimeConfig(config)

    expect(isReactive(result.properties)).toBe(false)
    expect(result).toEqual(config)
    expect(() => structuredClone(result)).not.toThrow()
  })
})
