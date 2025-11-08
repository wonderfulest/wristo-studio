<template>
  <el-dialog v-model="model" title="Create Icon Font" width="460px">
    <el-form :model="localForm" label-width="96px">
      <el-form-item label="Glyph Code">
        <el-input v-model="localForm.glyphCode" placeholder="e.g. my-icons" />
      </el-form-item>
      <el-form-item label="Style">
        <el-input v-model="localForm.style" placeholder="e.g. Regular" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Cancel</el-button>
      <el-button type="primary" :loading="loading" :disabled="!localForm.glyphCode" @click="onConfirm">Create</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { IconGlyphCreateDTO } from '@/api/wristo/iconGlyph'

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

watch(() => props.form, (f) => {
  if (f) Object.assign(localForm, { glyphCode: f.glyphCode ?? '', style: f.style ?? '', isDefault: 0, isActive: 1 })
}, { immediate: true })

const loading = computed(() => !!props.loading)

const onConfirm = () => {
  emit('confirm', { ...localForm })
}
</script>
