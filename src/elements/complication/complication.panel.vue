<template>
  <div class="settings-section">
    <el-form label-position="top">
      <section class="property-group" data-testid="complication-source-group">
        <h3>Content Source</h3>
        <el-form-item label="Source Binding">
          <el-select :model-value="model.complicationProperty || ''" @change="set('complicationProperty', $event)">
            <el-option label="Fixed Source" value="" />
            <el-option v-for="[key, property] in properties" :key="key" :label="property.title" :value="key" />
          </el-select>
          <el-button link @click="createProperty">New Complication Property</el-button>
        </el-form-item>
        <el-form-item v-if="!model.complicationProperty" label="Source">
          <el-select :model-value="model.complicationType" filterable @change="set('complicationType', $event)">
            <el-option v-for="option in COMPLICATION_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <template v-else>
          <p>Default: {{ selectedSource?.label || 'Missing Property' }}</p>
          <p>Allowed sources: {{ allowedSources }}</p>
          <p>Edit the default and allowed sources in Properties and App Settings.</p>
        </template>
      </section>
      <section class="property-group" data-testid="complication-display-group">
        <h3>Display Style</h3>
        <el-form-item label="Style">
          <el-select :model-value="model.displayMode" @change="changeStyle">
            <el-option label="Transparent Area" value="shortcut" />
            <el-option label="Icon" value="icon" />
            <el-option label="Value" value="value" />
            <el-option label="Icon + Value" value="iconValue" />
            <el-option label="Progress Ring" value="progress" />
            <el-option label="Source Label" value="label" />
          </el-select>
        </el-form-item>
        <div class="pair">
          <el-form-item label="Display Width"><el-input-number :model-value="model.displayWidth" :min="30" :max="454" @change="set('displayWidth', $event)" /></el-form-item>
          <el-form-item label="Display Height"><el-input-number :model-value="model.displayHeight" :min="30" :max="454" @change="set('displayHeight', $event)" /></el-form-item>
        </div>
        <template v-if="['icon', 'iconValue'].includes(model.displayMode)">
          <el-form-item label="Icon Source">
            <el-select :model-value="model.iconSource" @change="set('iconSource', $event)">
              <el-option label="Follow Content Source" value="auto" />
              <el-option label="Custom Icon" value="custom" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="model.iconSource === 'custom'" label="Custom Icon">
            <el-select :model-value="model.customIcon" @change="set('customIcon', $event)">
              <el-option v-for="icon in COMPLICATION_ICON_OPTIONS" :key="icon.value" :label="icon.label" :value="icon.value" />
            </el-select>
            <p>The custom icon stays the same when the content source changes.</p>
          </el-form-item>
          <el-form-item label="Icon Size"><el-input-number :model-value="model.iconSize" :min="10" :max="200" @change="set('iconSize', $event)" /></el-form-item>
          <el-form-item v-if="model.displayMode === 'iconValue'" label="Icon Gap"><el-input-number :model-value="model.iconGap" :min="0" :max="100" @change="set('iconGap', $event)" /></el-form-item>
        </template>
        <template v-if="!['shortcut', 'icon'].includes(model.displayMode)">
          <el-form-item label="Font Size"><FontSizeSelect :model-value="model.fontSize" @update:model-value="set('fontSize', $event)" /></el-form-item>
          <el-form-item label="Font"><FontPicker :model-value="model.fontFamily" @update:model-value="set('fontFamily', $event)" /></el-form-item>
        </template>
        <template v-if="model.displayMode === 'progress'">
          <el-form-item label="Progress Range">
            <el-select :model-value="model.progressRange" @change="set('progressRange', $event)">
              <el-option label="From Content Source" value="source" />
              <el-option label="Custom Range" value="custom" />
            </el-select>
          </el-form-item>
          <div v-if="model.progressRange === 'custom'" class="pair">
            <el-form-item label="Minimum"><el-input-number :model-value="model.progressMin" :min="-1000000000" :max="model.progressMax - 1" @change="set('progressMin', $event)" /></el-form-item>
            <el-form-item label="Maximum"><el-input-number :model-value="model.progressMax" :min="model.progressMin + 1" :max="1000000000" @change="set('progressMax', $event)" /></el-form-item>
          </div>
          <p v-if="model.progressRange === 'custom'">Uses the source's raw units, such as meters for distance and minutes for recovery time.</p>
          <el-form-item label="Ring Thickness"><el-input-number :model-value="model.progressThickness" :min="1" :max="30" @change="set('progressThickness', $event)" /></el-form-item>
          <el-form-item label="Track Color"><el-color-picker :model-value="model.progressTrackColor" @change="set('progressTrackColor', $event)" /></el-form-item>
          <p v-if="previewProgress === null">No numeric range in this preview. The ring stays empty until a valid range is available.</p>
        </template>
        <template v-if="model.displayMode !== 'shortcut'">
          <el-form-item label="Content Color">
            <ColorPicker :model-value="model.fill" :property-key="model.fillProperty" @property-change="apply({ fill: $event.color, fillProperty: $event.propertyKey })" />
          </el-form-item>
          <el-form-item label="Background">
            <el-select :model-value="model.backgroundShape" @change="set('backgroundShape', $event)">
              <el-option label="None" value="none" />
              <el-option label="Circle" value="circle" />
              <el-option label="Rounded Rectangle" value="rounded" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="model.backgroundShape !== 'none'" label="Background Color">
            <el-color-picker :model-value="model.backgroundColor" @change="set('backgroundColor', $event)" />
          </el-form-item>
        </template>
        <p v-else>The blue guide is visible only in the editor and is not exported.</p>
      </section>
      <section class="property-group" data-testid="complication-touch-group">
        <h3>Touch Area</h3>
        <el-form-item label="Open On Long Press"><el-switch :model-value="model.launchOnPress" @change="set('launchOnPress', $event)" /></el-form-item>
        <el-form-item label="Area Size">
          <el-select :model-value="model.touchMode" @change="set('touchMode', $event)">
            <el-option label="Follow Display" value="auto" />
            <el-option label="Custom Size" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Shape">
          <el-select :model-value="model.touchShape" @change="set('touchShape', $event)">
            <el-option label="Rectangle" value="rectangle" />
            <el-option label="Circle" value="circle" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="model.touchMode === 'auto'" label="Touch Padding">
          <el-input-number :model-value="model.touchPadding" :min="0" :max="100" @change="set('touchPadding', $event)" />
        </el-form-item>
        <div v-else class="pair">
          <el-form-item label="Touch Width"><el-input-number :model-value="model.touchWidth" :min="30" :max="454" @change="set('touchWidth', $event)" /></el-form-item>
          <el-form-item label="Touch Height"><el-input-number :model-value="model.touchHeight" :min="30" :max="454" @change="set('touchHeight', $event)" /></el-form-item>
        </div>
        <div class="pair">
          <el-form-item label="Offset X"><el-input-number :model-value="model.touchOffsetX" :min="-454" :max="454" @change="set('touchOffsetX', $event)" /></el-form-item>
          <el-form-item label="Offset Y"><el-input-number :model-value="model.touchOffsetY" :min="-454" :max="454" @change="set('touchOffsetY', $event)" /></el-form-item>
        </div>
        <p v-if="model.touchShape === 'circle'">The circle is centered in the area and uses its shorter side as the diameter.</p>
        <p>Preview uses sample data. Source availability and long press support depend on the watch.</p>
      </section>
    </el-form>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import { updateElement } from '@/engine/managers/elementManager'
import { COMPLICATION_OPTIONS, resolveComplicationType } from './complication.catalog'
import { COMPLICATION_ICON_OPTIONS, complicationProgress, normalizeComplicationPresentation } from './complication.presentation'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import emitter from '@/utils/eventBus'
const props = defineProps<{ element?: any; config?: Record<string, any> | null; applyPatch?: (patch: Record<string, any>) => void }>()
const store = usePropertiesStore()
const model = computed(() => normalizeComplicationPresentation(props.config ?? props.element ?? {}))
const properties = computed(() => Object.entries(store.allProperties).filter(([, property]) => property.type === 'complication'))
const selectedSource = computed(() => {
  try {
    return COMPLICATION_OPTIONS.find((option) => option.value === resolveComplicationType(model.value, store.allProperties))
  } catch {
    return undefined
  }
})
const allowedSources = computed(() => store.allProperties[model.value.complicationProperty || '']?.options?.map((option) => option.label).join(', ') || 'None')
const previewProgress = computed(() => complicationProgress(model.value, selectedSource.value?.value ?? 18))
function apply(patch: Record<string, any>) {
  if (props.applyPatch && props.config) props.applyPatch(patch)
  else if (props.element) void updateElement(props.element, patch)
}
function set(key: string, value: unknown) {
  if (value !== null && value !== undefined) apply({ [key]: value })
}
function changeStyle(value: string) {
  // Each style starts at a readable size; changing the content source never resizes it.
  const sizes: Record<string, [number, number]> = { icon: [60, 60], progress: [160, 160], value: [160, 64], label: [180, 64], iconValue: [180, 64] }
  const size = sizes[value]
  apply({ displayMode: value, ...(size ? { displayWidth: size[0], displayHeight: size[1] } : {}) })
}
function createProperty() {
  emitter.emit('open-app-properties', { type: 'complication' } as any)
}
</script>
<style scoped>
.settings-section {
  padding: 0 16px;
}
.property-group {
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color);
}
.property-group:last-child {
  border-bottom: none;
}
h3 {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
}
p {
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.5;
  margin: 6px 0;
}
.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}
.pair :deep(.el-input-number) {
  width: 100%;
}
:deep(.el-select) {
  width: 100%;
}
</style>
