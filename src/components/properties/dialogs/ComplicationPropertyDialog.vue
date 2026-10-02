<template>
  <el-dialog v-model="visible" title="Complication Property" width="620px">
    <el-form label-position="top">
      <el-form-item label="Title"><el-input v-model="title" /></el-form-item>
      <el-form-item label="Key"><el-input v-model="key" :disabled="isEdit" /></el-form-item>
      <el-form-item label="Allowed Complications">
        <el-select v-model="selected" multiple filterable style="width: 100%" @change="ensureDefault">
          <el-option v-for="option in COMPLICATION_OPTIONS" :key="option.value" :label="`${option.label} · API ${option.minApi}`" :value="option.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="Default Complication">
        <el-select v-model="defaultValue"><el-option v-for="option in options" :key="option.value" :label="option.label" :value="option.value" /></el-select>
      </el-form-item>
      <p>Users can switch between these sources in the app settings. Unsupported sources show -- on the watch.</p>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <el-button type="primary" @click="confirm">Save</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { usePropertiesStore } from '@/stores/properties'
import { COMPLICATION_OPTIONS, validateComplicationProperty } from '@/elements/complication/complication.catalog'
const emit = defineEmits(['confirm'])
const visible = ref(false),
  isEdit = ref(false),
  title = ref('Complication 1'),
  key = ref('complication_1')
const selected = ref<number[]>([18, 2, 1, 8]),
  defaultValue = ref(18)
const options = computed(() => selected.value.map((value) => COMPLICATION_OPTIONS.find((option) => option.value === value)!).filter(Boolean))
function ensureDefault() {
  if (!selected.value.includes(defaultValue.value)) defaultValue.value = selected.value[0]
}
function show(property?: any) {
  isEdit.value = Boolean(property?.propertyKey)
  let index = 1
  while (usePropertiesStore().allProperties[`complication_${index}`]) index++
  key.value = property?.propertyKey ?? `complication_${index}`
  title.value = property?.title ?? `Complication ${index}`
  selected.value = property?.options?.map((option: any) => option.value) ?? [18, 2, 1, 8]
  defaultValue.value = property?.value ?? 18
  visible.value = true
}
function confirm() {
  try {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key.value) || !title.value.trim()) throw new Error('Enter a valid key and title')
    const property = { type: 'complication' as const, title: title.value.trim(), options: options.value.map(({ value, label }) => ({ value, label })), value: defaultValue.value }
    validateComplicationProperty(property)
    emit('confirm', { ...property, key: key.value, defaultValue: defaultValue.value, isEdit: isEdit.value })
    visible.value = false
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}
defineExpose({ show })
</script>
