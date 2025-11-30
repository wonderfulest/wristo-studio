<template>
  <el-dialog v-model="model" title="Create Icon Font" width="460px">
    <FontNamingBar ref="namingRef" type="icon"/>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Cancel</el-button>
      <el-button type="primary" :loading="loading" @click="onConfirm">Create</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { IconGlyphCreateDTO } from '@/api/wristo/iconGlyph'
import FontNamingBar from '@/components/fonts/FontNamingBar.vue'

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

const onConfirm = () => {
  console.log('onConfirm', namingRef.value)
  const naming = namingRef.value as any
  const namingPreview = naming?.namingPreview ?? ''
  if (!namingPreview) {
    console.log('onConfirm 111')
    return
  }

  const code = String(namingPreview)
  const parts = code.split('-').filter(Boolean)
  const last = parts[parts.length - 1] || ''

  const payload: IconGlyphCreateDTO = {
    ...localForm,
    glyphCode: code,
    style: last,
  }
    console.log('onConfirm  22',  payload)

  emit('confirm', payload)
}
</script>
