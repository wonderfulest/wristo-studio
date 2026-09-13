<template>
  <section v-if="elementIds.length" class="layout-visibility-field">
    <label>Show in layouts</label>
    <template v-if="layout">
      <el-select :model-value="selectedValues" multiple clearable :placeholder="mixed ? 'Mixed layouts' : 'All layouts'" aria-label="Show in layouts" style="width: 100%" :disabled="saving" @update:model-value="apply">
        <el-option v-for="option in layout[1].options" :key="Number(option.value)" :label="option.label" :value="Number(option.value)" />
      </el-select>
      <el-button link type="primary" :disabled="saving" @click="apply([])">All layouts</el-button>
      <p>{{ mixed ? 'Selected elements have different layout bindings.' : 'No selection means all layouts. Dynamic visibility also applies.' }}</p>
    </template>
    <el-button v-else link type="primary" @click="emitter.emit('open-app-properties', { type: 'layout' })">Configure global layouts</el-button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useLayerStore } from '@/stores/layerStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { applySharedElementPatch } from '@/engine/managers/elementManager'
import { reflowAllLayoutGroups } from '@/engine/layout/studioLayoutController'
import { layoutProperties } from '@/engine/services/layoutConfig'
import emitter from '@/utils/eventBus'
import type { AnyElementConfig } from '@/types/elements'

const props = defineProps<{ elementIds: string[]; applyPatch?: (patch: Partial<AnyElementConfig>) => Promise<void> }>()
const properties = usePropertiesStore()
const elements = useElementDataStore()
const layers = useLayerStore()
const layout = computed(() => layoutProperties(properties.allProperties)[0])
const bindings = computed(() => props.elementIds.map(id => elements.getElementConfig(id)?.layoutVisibility))
const signature = (binding: typeof bindings.value[number]) => binding == null ? '' : `${binding.propertyKey}:${[...binding.values].sort((a, b) => a - b).join(',')}`
const mixed = computed(() => new Set(bindings.value.map(signature)).size > 1)
const selectedValues = computed(() => mixed.value ? [] : bindings.value[0]?.values ?? [])
const saving = ref(false)
async function apply(values: number[]) {
  if (!layout.value) return
  const ids = [...props.elementIds]
  const binding = values.length ? { propertyKey: layout.value[0], values: [...values] } : null
  saving.value = true
  try {
    if (ids.length === 1 && props.applyPatch) {
      await props.applyPatch({ layoutVisibility: binding })
      return
    }
    for (const id of ids) {
      elements.patchElement(id, { layoutVisibility: binding })
      const element = layers.layers.find(layer => layer.id === id)?.element
      if (element) applySharedElementPatch(element, { layoutVisibility: binding })
    }
    layers.applyPreviewVisibility()
    reflowAllLayoutGroups()
    // Hidden objects must not keep interactive selection handles on the canvas.
    if (ids.some(id => layers.layers.find(layer => layer.id === id)?.visible === false)) {
      useCanvasStore().canvas?.discardActiveObject?.()
    }
    useHistoryStore().saveState('layout:bind-selection')
  } catch (error) { ElMessage.error((error as Error).message) }
  finally { saving.value = false }
}
</script>

<style scoped>
.layout-visibility-field { display: grid; gap: 10px; padding: 14px; border-top: 1px solid var(--el-border-color-lighter); }
label { font-weight: 600; }
p { font-size: 12px; line-height: 1.5; color: var(--el-text-color-secondary); margin: 0; }
</style>
