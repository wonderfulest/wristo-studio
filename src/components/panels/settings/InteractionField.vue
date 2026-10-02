<template>
  <section v-if="supported" class="interaction-field" data-testid="element-interaction">
    <div class="interaction-heading"><h3>Interaction</h3><el-switch :model-value="enabled" aria-label="Enable Interaction" @change="toggle" /></div>
    <p v-if="!enabled">Open a Complication by long-pressing this element.</p>
    <el-form v-else label-position="top">
      <p>Open Complication · Long Press</p>
      <el-form-item label="Target">
        <el-select :model-value="model.target" @change="set('target', $event)">
          <el-option label="Follow Element Source" value="element" :disabled="!!follow.error" />
          <el-option label="Fixed Source" value="fixed" />
          <el-option label="Complication Property" value="property" />
        </el-select>
      </el-form-item>
      <template v-if="model.target === 'element'">
        <p v-if="follow.propertyTitle">Linked Property: {{ follow.propertyTitle }}</p>
        <p v-if="follow.error" class="error">{{ follow.error }}</p>
        <p v-if="follow.unsupported?.length">Display only (no long-press target): {{ follow.unsupported.join(', ') }}</p>
      </template>
      <el-form-item v-if="model.target === 'fixed'" label="Source">
        <el-select :model-value="model.complicationType" filterable @change="set('complicationType', $event)">
          <el-option v-for="source in COMPLICATION_OPTIONS" :key="source.value" :label="source.label" :value="source.value" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="model.target === 'property'" label="Complication Property">
        <el-select :model-value="model.complicationProperty" placeholder="Choose a property" @change="set('complicationProperty', $event)">
          <el-option v-for="[key, property] in properties" :key="key" :label="property.title" :value="key" />
        </el-select>
        <el-button link @click="createProperty">New Complication Property</el-button>
      </el-form-item>
      <p v-if="selectedSource">Opens: {{ selectedSource.label }}</p>
      <p v-else-if="model.target === 'element' && !follow.error">Current selection displays data only; no long-press area is registered.</p>
      <p v-else class="error">Choose an available source before exporting.</p>
      <el-form-item label="Touch Area">
        <el-select :model-value="model.touchMode" @change="set('touchMode', $event)">
          <el-option label="Follow Element" value="auto" /><el-option label="Custom Size" value="custom" />
        </el-select>
      </el-form-item>
      <el-form-item label="Shape">
        <el-select :model-value="model.touchShape" @change="set('touchShape', $event)">
          <el-option label="Rectangle" value="rectangle" /><el-option label="Circle" value="circle" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="model.touchMode === 'auto'" label="Touch Padding"><el-input-number :model-value="model.touchPadding" :min="0" :max="100" @change="set('touchPadding', $event)" /></el-form-item>
      <div v-else class="pair">
        <el-form-item label="Touch Width"><el-input-number :model-value="model.touchWidth" :min="30" :max="454" @change="set('touchWidth', $event)" /></el-form-item>
        <el-form-item label="Touch Height"><el-input-number :model-value="model.touchHeight" :min="30" :max="454" @change="set('touchHeight', $event)" /></el-form-item>
      </div>
      <div class="pair">
        <el-form-item label="Offset X"><el-input-number :model-value="model.touchOffsetX" :min="-454" :max="454" @change="set('touchOffsetX', $event)" /></el-form-item>
        <el-form-item label="Offset Y"><el-input-number :model-value="model.touchOffsetY" :min="-454" :max="454" @change="set('touchOffsetY', $event)" /></el-form-item>
      </div>
      <p>Follow Element uses the element's design bounds. Adjust padding for changing text lengths. The blue guide is editor-only.</p>
      <p v-if="model.touchShape === 'circle'">The shorter side defines the circle's diameter.</p>
      <p>Availability depends on the watch. The element's appearance and displayed data stay unchanged.</p>
    </el-form>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnyElementConfig } from '@/types/elements'
import type { ElementInteraction } from '@/types/interaction'
import { usePropertiesStore } from '@/stores/properties'
import { COMPLICATION_OPTIONS } from '@/elements/complication/complication.catalog'
import { captureInteraction, followElementSource, INTERACTION_DEFAULTS, supportsElementInteraction } from '@/engine/interaction/elementInteraction'
import emitter from '@/utils/eventBus'
const props = defineProps<{ config: AnyElementConfig | null; element?: any; applyPatch?: (patch: Partial<AnyElementConfig>) => Promise<void> | void }>()
const store = usePropertiesStore()
const error = ref('')
const supported = computed(() => supportsElementInteraction(props.config ?? props.element))
const model = computed(() => ({ ...INTERACTION_DEFAULTS, ...props.config?.interaction }))
const enabled = computed(() => model.value.action === 'complication')
const follow = computed(() => followElementSource(props.config ?? props.element ?? {}, store.allProperties, store.dataOptions))
const properties = computed(() => Object.entries(store.allProperties).filter(([, property]) => property.type === 'complication'))
const selectedSource = computed(() => {
  const type = model.value.target === 'element' ? follow.value.source : model.value.target === 'property' ? store.allProperties[model.value.complicationProperty]?.value : model.value.complicationType
  return COMPLICATION_OPTIONS.find(source => source.value === type)
})
async function apply(patch: Partial<ElementInteraction>) {
  error.value = ''
  try {
    const interaction = captureInteraction(props.element ?? props.config, { ...model.value, ...patch })
    await props.applyPatch?.({ interaction } as Partial<AnyElementConfig>)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause) }
}
function toggle(value: unknown) {
  void apply({ action: value ? 'complication' : 'none', ...(!props.config?.interaction?.target && value ? { target: !follow.value.error ? 'element' : 'fixed' } : {}) })
}
function set(key: keyof ElementInteraction, value: unknown) { if (value != null) void apply({ [key]: value }) }
function createProperty() { emitter.emit('open-app-properties', { type: 'complication' } as any) }
</script>
<style scoped>
.interaction-field { border-top: 1px solid var(--el-border-color-lighter); padding: 16px; }
.interaction-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h3 { font-size: 13px; font-weight: 600; margin: 0; }
p { font-size: 12px; color: var(--studio-text-muted); line-height: 1.5; }
.error { color: var(--el-color-danger); }
.pair { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 8px; }
.pair :deep(.el-input-number), :deep(.el-select) { width: 100%; }
</style>
