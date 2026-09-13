<template>
  <el-dialog v-model="visible" title="Global layout" width="600px" :close-on-click-modal="false">
    <el-form label-position="top">
      <el-form-item label="Setting title"><el-input v-model="title" maxlength="80" /></el-form-item>
      <el-form-item label="Default layout">
        <el-select v-model="defaultValue" style="width: 100%">
          <el-option v-for="option in options" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </el-form-item>
      <p class="layout-hint">The default is saved with the watchface. Use the toolbar to preview a different layout.</p>
      <div v-for="(option, index) in options" :key="option.value" class="layout-option">
        <el-input v-model="option.label" :aria-label="`Layout ${index + 1} name`" maxlength="80" />
        <el-button :disabled="index === 0" :aria-label="`Move ${option.label} up`" @click="move(index, -1)">↑</el-button>
        <el-button :disabled="index === options.length - 1" :aria-label="`Move ${option.label} down`" @click="move(index, 1)">↓</el-button>
        <el-button :disabled="options.length === 1 || isReferenced(option.value)" type="danger" plain :title="isReferenced(option.value) ? 'Update element bindings before removing this layout.' : 'Remove layout'" @click="remove(index)">Remove</el-button>
      </div>
      <el-button class="add-layout" @click="add">Add layout</el-button>
      <p class="layout-hint">Layouts used by elements cannot be removed until their bindings are updated.</p>
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <el-button type="primary" @click="save">Save layouts</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'
import { layoutProperties, validateLayoutConfig } from '@/engine/services/layoutConfig'
import type { PropertyItem } from '@/types/properties'

const emit = defineEmits<{ confirm: [payload: { key: string; type: 'layout'; title: string; defaultValue: number; options: Array<{label: string; value: number}>; nextLayoutValue: number; isEdit: boolean }] }>()
const properties = usePropertiesStore()
const elements = useElementDataStore()
const visible = ref(false)
const key = ref('layout')
const title = ref('Layout')
const defaultValue = ref(1)
const options = ref<Array<{ label: string; value: number }>>([])
const isEdit = ref(false)
const error = ref('')
let nextValue = 1
const configs = computed(() => elements.elements.map(snapshot => snapshot.config))
const isReferenced = (value: number) => configs.value.some(config => config.layoutVisibility?.propertyKey === key.value && config.layoutVisibility.values.includes(value))
function show(data?: PropertyItem & { propertyKey?: string }) {
  const existing = layoutProperties(properties.allProperties)[0]
  const property = existing ? { ...existing[1], propertyKey: existing[0] } : data
  isEdit.value = Boolean(property?.propertyKey)
  let availableKey = 'layout'
  let suffix = 1
  while (properties.allProperties[availableKey]) availableKey = `layout_${suffix++}`
  key.value = property?.propertyKey || availableKey
  title.value = property?.title || 'Layout'
  defaultValue.value = Number(property?.value ?? 1)
  options.value = property?.options?.map(option => ({ label: option.label, value: Number(option.value) }))
    || [{ label: 'Layout A', value: 1 }, { label: 'Layout B', value: 2 }]
  nextValue = Math.max(property?.nextLayoutValue ?? 1, Math.max(0, ...options.value.map(option => option.value)) + 1)
  error.value = ''
  visible.value = true
}
function add() {
  let labelIndex = nextValue
  while (options.value.some(option => option.label.toLowerCase() === `layout ${labelIndex}`)) labelIndex++
  options.value.push({ label: `Layout ${labelIndex}`, value: nextValue++ })
}
function remove(index: number) {
  if (options.value.length < 2 || isReferenced(options.value[index].value)) return
  const [removed] = options.value.splice(index, 1)
  if (defaultValue.value === removed.value) defaultValue.value = options.value[0].value
}
function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= options.value.length) return
  const [option] = options.value.splice(index, 1)
  options.value.splice(target, 0, option)
}
function save() {
  const property: PropertyItem = { type: 'layout', title: title.value.trim(), value: defaultValue.value, options: options.value.map(option => ({ ...option, label: option.label.trim() })) }
  const errors = validateLayoutConfig({ ...properties.allProperties, [key.value]: property }, configs.value)
  if (errors.length) { error.value = errors.join(' '); return }
  emit('confirm', { key: key.value, type: 'layout', title: property.title, defaultValue: defaultValue.value, options: property.options as Array<{label: string; value: number}>, nextLayoutValue: nextValue, isEdit: isEdit.value })
  visible.value = false
}
defineExpose({ show })
</script>

<style scoped>
.layout-option { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.layout-option :deep(.el-button + .el-button) { margin-left: 0; }
.layout-hint { font-size: 12px; line-height: 1.5; color: var(--el-text-color-secondary); }
.add-layout { margin-top: 4px; }
</style>
