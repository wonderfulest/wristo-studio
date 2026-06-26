<template>
  <SvgEditorDialog
    v-model="visibleInner"
    :initial-svg="editSvgContent"
    :saving="saving"
    :title="t('icon.svgEditorTitle')"
    :placeholder="t('icon.svgPlaceholder')"
    :save-label="t('common.save')"
    @save="save"
    @closed="onClosed"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import SvgEditorDialog from '@/components/svg-editor/SvgEditorDialog.vue'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { getIconAssetDetail, cropIconSvg } from '@/api/icon-asset'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()

interface Props {
  modelValue: boolean
  assetId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
}>()

const visibleInner = ref(false)
const saving = ref(false)
const editSvgContent = ref('')

watch(() => props.modelValue, v => {
  if (v && !userStore.canUsePremiumStudioAssets) {
    visibleInner.value = false
    emit('update:modelValue', false)
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  visibleInner.value = v
})
watch(visibleInner, v => {
  if (v && !userStore.canUsePremiumStudioAssets) {
    visibleInner.value = false
    emit('update:modelValue', false)
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  emit('update:modelValue', v)
})

watch(() => props.assetId, async (id) => {
  if (!visibleInner.value || !id) return
  await loadDetail(id)
})

watch(visibleInner, async (v) => {
  if (v && props.assetId) {
    await loadDetail(props.assetId)
  }
})

async function loadDetail(id: number) {
  editSvgContent.value = ''
  try {
    const resp = await getIconAssetDetail(id, { populate: 'svg_content' })
    const data: any = (resp as any)?.data
    if (data && typeof data.svgContent === 'string') {
      editSvgContent.value = data.svgContent
    }
  } catch (e) {
    ElMessage.error(t('icon.loadSvgFailed'))
  }
}

function onClosed() {
  editSvgContent.value = ''
}

async function save(svgContent: string) {
  if (!userStore.canUsePremiumStudioAssets) {
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  if (!props.assetId) return
  saving.value = true
  try {
    await cropIconSvg({ id: props.assetId, svgContent })
    ElMessage.success(t('icon.saveSuccess'))
    visibleInner.value = false
    emit('saved')
  } catch (e) {
    ElMessage.error(t('icon.saveFailed'))
  } finally {
    saving.value = false
  }
}
</script>
