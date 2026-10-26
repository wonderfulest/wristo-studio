import { h, ref } from 'vue'
import { ElMessageBox, ElSwitch } from 'element-plus'

export async function chooseDesignVisibility(t: (key: string) => string): Promise<{ publiclyVisible: boolean; allowRemix: boolean } | null> {
  const publiclyVisible = ref(true)
  const allowRemix = ref(false)
  try {
    await ElMessageBox({
      title: t('createDesign.title'),
      message: () => h('div', [
        h('label', { style: 'display:flex;align-items:center;gap:16px' }, [
          h('span', t('createDesign.publiclyVisible')),
          h(ElSwitch, {
            modelValue: publiclyVisible.value,
            'aria-label': t('createDesign.publiclyVisible'),
            'onUpdate:modelValue': (value: boolean | string | number) => { publiclyVisible.value = Boolean(value) },
          }),
        ]),
        h('p', t('createDesign.publiclyVisibleHint')),
        h('label', { style: 'display:flex;align-items:center;gap:16px' }, [
          h('span', t('createDesign.allowRemix')),
          h(ElSwitch, {
            modelValue: allowRemix.value,
            'aria-label': t('createDesign.allowRemix'),
            'onUpdate:modelValue': (value: boolean | string | number) => { allowRemix.value = Boolean(value) },
          }),
        ]),
        h('p', t('createDesign.allowRemixHint')),
      ]),
      showCancelButton: true,
      confirmButtonText: t('createDesign.create'),
      cancelButtonText: t('common.cancel'),
      closeOnClickModal: false,
    })
    return { publiclyVisible: publiclyVisible.value, allowRemix: allowRemix.value }
  } catch (action) {
    if (action === 'cancel' || action === 'close') return null
    throw action
  }
}
