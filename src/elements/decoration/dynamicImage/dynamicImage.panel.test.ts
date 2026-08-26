// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import DynamicImagePanel from './dynamicImage.panel.vue'

describe('dynamic image panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('deletes a rule directly from its list row', async () => {
    const applyPatch = vi.fn()
    const items = [
      {
        id: 'day',
        imageUrl: 'https://cdn.example/day.png',
        expression: parseExpression('(as2.2) == 1', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      },
      {
        id: 'night',
        imageUrl: 'https://cdn.example/night.png',
        expression: parseExpression('(as2.2) == 0', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      },
    ]
    const wrapper = shallowMount(DynamicImagePanel, {
      props: { config: { width: 100, height: 50, items }, applyPatch },
      global: {
        stubs: {
          'el-button': { template: '<button><slot /></button>' },
          'el-dialog': true,
          AssetPicker: true,
          ExpressionEditor: true,
          TokenPreviewControls: true,
          DynamicImageGroupCopyDialog: true,
        },
      },
    })

    const firstRow = wrapper.findAll('.dynamic-image-row')[0]
    const deleteButton = firstRow.findAll('button').find((button) => button.text() === 'Delete')

    expect(deleteButton).toBeDefined()
    await deleteButton!.trigger('click')
    expect(applyPatch).toHaveBeenCalledWith({ items: [items[1]] })
  })
})
