// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UploadSharingDecisionDialog from './UploadSharingDecisionDialog.vue'

const mountDialog = () => mount(UploadSharingDecisionDialog, {
  props: {
    visible: true,
    remember: false,
    saving: false,
    translate: (key: string) => key,
  },
  global: {
    stubs: {
      'el-dialog': {
        template: '<section><slot /><slot name="footer" /></section>',
      },
      'el-button': {
        template: '<button><slot /></button>',
      },
    },
  },
})

describe('UploadSharingDecisionDialog', () => {
  it('lets the user choose private or shared with one decision click', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-test="keep-private"]').trigger('click')
    await wrapper.get('[data-test="share-upload"]').trigger('click')

    expect(wrapper.emitted('choose')).toEqual([[false], [true]])
  })

  it('reports whether the browser should remember the choice', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-test="remember-sharing-choice"]').setValue(true)

    expect(wrapper.emitted('update:remember')).toEqual([[true]])
  })
})
