<template>
  <el-dialog v-model="model" title="Import Assets From Font" width="460px">
    <el-form label-width="96px">
      <el-form-item label="From Font">
        <el-select v-model="localSelected" placeholder="Select a font" filterable style="width: 100%">
          <el-option
            v-for="g in glyphs"
            :key="g.id"
            :label="tabLabel(g)"
            :value="g.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Cancel</el-button>
      <el-button type="primary" :disabled="!localSelected" :loading="!!loading" @click="onConfirm">Import</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { IconGlyphVO } from '@/api/wristo/iconGlyph'

const props = defineProps<{
  modelValue: boolean
  glyphs: IconGlyphVO[]
  selectedId?: number | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:selectedId', value: number | null): void
  (e: 'confirm'): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const localSelected = ref<number | null>(null)
watch(() => props.selectedId, (v) => { localSelected.value = v ?? null }, { immediate: true })
watch(localSelected, (v) => emit('update:selectedId', v ?? null))

const tabLabel = (g: IconGlyphVO) => {
  const tag = g.isDefault === 1 ? 'Default' : 'Custom'
  return `${g.glyphCode || 'Font'} · ${tag}`
}

const loading = computed(() => props.loading)

const onConfirm = () => {
  emit('confirm')
}
</script>
