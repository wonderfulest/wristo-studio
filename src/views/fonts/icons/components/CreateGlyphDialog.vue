<template>
  <el-dialog
    v-model="model"
    :title="t('icon.createIconFont')"
    width="min(680px, calc(100vw - 32px))"
    class="icon-font-dialog"
  >
    <FontNamingBar ref="namingRef" type="icon"/>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="onConfirm">{{ t('common.create') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { IconGlyphCreateDTO } from '@/api/wristo/iconGlyph'
import FontNamingBar from '@/components/fonts/FontNamingBar.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  form?: Partial<IconGlyphCreateDTO>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: IconGlyphCreateDTO): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const localForm = reactive<IconGlyphCreateDTO>({ glyphCode: '', style: '', isDefault: 0, isActive: 1 })

const namingRef = ref<InstanceType<typeof FontNamingBar> | null>(null)

watch(() => props.form, (f) => {
  if (f) Object.assign(localForm, { glyphCode: f.glyphCode ?? '', style: f.style ?? '', isDefault: 0, isActive: 1 })
}, { immediate: true })

const loading = computed(() => !!props.loading)

watch(model, async (visible) => {
  if (!visible) return
  await nextTick()
  ;(namingRef.value as any)?.randomizeName?.()
})

const onConfirm = () => {
  const naming = namingRef.value as any
  naming?.normalizeAllParts?.()
  const namingPayload = naming?.getNamingPayload?.()
  const code = String(namingPayload?.name || '')
  if (!code) {
    ElMessage.error(t('font.enterValidName'))
    return
  }

  const payload: IconGlyphCreateDTO = {
    ...localForm,
    glyphCode: code,
    style: namingPayload?.variant || namingPayload?.style || '',
  }

  emit('confirm', payload)
}
</script>
