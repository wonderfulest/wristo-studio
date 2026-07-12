<template>
  <div class="settings-section sub-dial-settings">
    <el-form label-position="top">
      <section class="settings-card">
        <h3>{{ t('subDial.data') }}</h3>
        <GoalPropertyField :model-value="model.goalProperty" :required="false" @change="patch({ goalProperty: $event })" />
        <el-form-item :label="t('subDial.rangeMode')">
          <el-segmented :model-value="model.rangeMode" :options="rangeOptions" @change="changeRangeMode" />
        </el-form-item>
        <div v-if="model.rangeMode === 'custom'" class="settings-grid">
          <el-form-item :label="t('subDial.minimum')">
            <el-input-number :model-value="model.minValue" @change="changeCustomRange('minValue', $event)" />
          </el-form-item>
          <el-form-item :label="t('subDial.maximum')" :error="rangeError">
            <el-input-number :model-value="model.maxValue" @change="changeCustomRange('maxValue', $event)" />
          </el-form-item>
        </div>
        <el-form-item :label="t('subDial.previewValue')">
          <el-slider :model-value="model.previewValue" :min="effectiveMin" :max="effectiveMax" @input="patch({ previewValue: Number($event) })" />
        </el-form-item>
        <el-form-item :label="t('subDial.outOfRange')">
          <el-select :model-value="model.outOfRangeBehavior" @change="patch({ outOfRangeBehavior: $event })">
            <el-option :label="t('subDial.clamp')" value="clamp" />
            <el-option :label="t('subDial.hide')" value="hide" />
          </el-select>
        </el-form-item>
      </section>

      <section class="settings-card">
        <h3>{{ t('subDial.dial') }}</h3>
        <div class="settings-grid">
          <el-form-item :label="t('elementSettings.startAngle')">
            <el-input-number :model-value="model.startAngle" @change="patch({ startAngle: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.endAngle')">
            <el-input-number :model-value="model.endAngle" @change="patch({ endAngle: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.direction')">
            <el-switch :model-value="model.counterClockwise" @change="patch({ counterClockwise: Boolean($event) })" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.backgroundColor')">
            <ColorPicker :model-value="model.backgroundColor" @change="patch({ backgroundColor: $event })" />
          </el-form-item>
        </div>
      </section>

      <section class="settings-card">
        <h3>{{ t('subDial.ticks') }}</h3>
        <div class="settings-grid">
          <el-form-item :label="t('subDial.majorTicks')">
            <el-input-number :model-value="model.majorTicks" :min="0" :max="60" @change="patch({ majorTicks: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.minorTicks')">
            <el-input-number :model-value="model.minorTicks" :min="0" :max="120" @change="patch({ minorTicks: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.majorColor')">
            <ColorPicker :model-value="model.majorTickColor" @change="patch({ majorTickColor: $event })" />
          </el-form-item>
          <el-form-item :label="t('subDial.minorColor')">
            <ColorPicker :model-value="model.minorTickColor" @change="patch({ minorTickColor: $event })" />
          </el-form-item>
        </div>
      </section>

      <section class="settings-card">
        <h3>{{ t('subDial.pointer') }}</h3>
        <el-form-item :label="t('elementSettings.style')">
          <el-segmented :model-value="model.pointer.style" :options="pointerOptions" @change="patchPointer({ style: $event })" />
        </el-form-item>
        <AssetPicker
          v-if="model.pointer.style === 'image'"
          :selected-url="model.pointer.imageUrl || undefined"
          :selected-asset-id="numericAssetId"
          asset-type="hour"
          :on-select="selectPointerAsset"
          :on-upload="selectPointerAsset"
        />
        <div class="settings-grid">
          <el-form-item v-if="model.pointer.style !== 'image'" :label="t('subDial.pointerColor')">
            <ColorPicker :model-value="model.pointer.color" @change="patchPointer({ color: $event })" />
          </el-form-item>
          <el-form-item :label="t('subDial.pointerLength')">
            <el-input-number :model-value="model.pointer.lengthRatio" :min="0.1" :max="1.2" :step="0.05" @change="patchPointer({ lengthRatio: Number($event) })" />
          </el-form-item>
          <el-form-item v-if="model.pointer.style === 'image'" :label="t('subDial.pivotX')">
            <el-input-number :model-value="model.pointer.pivotX" :min="0" :max="1" :step="0.01" @change="patchPointer({ pivotX: Number($event) })" />
          </el-form-item>
          <el-form-item v-if="model.pointer.style === 'image'" :label="t('subDial.pivotY')">
            <el-input-number :model-value="model.pointer.pivotY" :min="0" :max="1" :step="0.01" @change="patchPointer({ pivotY: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.rotationOffset')">
            <el-input-number :model-value="model.pointer.rotationOffset" @change="patchPointer({ rotationOffset: Number($event) })" />
          </el-form-item>
        </div>
      </section>

      <section class="settings-card">
        <h3>{{ t('subDial.centerCap') }}</h3>
        <el-switch :model-value="model.showCenterCap" @change="patch({ showCenterCap: Boolean($event) })" />
        <div class="settings-grid">
          <el-form-item :label="t('elementSettings.radius')">
            <el-input-number :model-value="model.centerCapRadius" :min="0" @change="patch({ centerCapRadius: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.color')">
            <ColorPicker :model-value="model.centerCapColor" @change="patch({ centerCapColor: $event })" />
          </el-form-item>
        </div>
      </section>

      <section class="settings-card">
        <h3>{{ t('subDial.value') }}</h3>
        <div class="settings-grid">
          <el-form-item :label="t('subDial.showValue')">
            <el-switch :model-value="model.showValue" @change="patch({ showValue: Boolean($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.showUnit')">
            <el-switch :model-value="model.showUnit" @change="patch({ showUnit: Boolean($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.unit')">
            <el-input :model-value="model.unit" @change="patch({ unit: String($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.decimals')">
            <el-input-number :model-value="model.decimals" :min="0" :max="6" @change="patch({ decimals: Number($event) })" />
          </el-form-item>
        </div>
      </section>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as elementManager from '@/engine/managers/elementManager'
import AssetPicker from '@/components/asset-picker/index.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import type { SubDialElementConfig, SubDialPointerConfig, SubDialRangeMode } from '@/types/elements/subDial'
import { useI18n } from '@/i18n'
import { buildSubDialPointerAssetPatch, buildSubDialRangePatch } from './subDial.panelModel'

const props = defineProps<{
  element?: any
  config?: SubDialElementConfig | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()
const model = computed(() => (props.config ?? props.element) as SubDialElementConfig)
const rangeError = ref('')
const rangeOptions = computed(() => [
  { label: t('subDial.percentage'), value: 'percentage' },
  { label: t('subDial.custom'), value: 'custom' },
])
const pointerOptions = computed(() => [
  { label: t('subDial.line'), value: 'line' },
  { label: t('subDial.triangle'), value: 'triangle' },
  { label: t('subDial.image'), value: 'image' },
])
const effectiveMin = computed(() => model.value.rangeMode === 'percentage' ? 0 : model.value.minValue)
const effectiveMax = computed(() => model.value.rangeMode === 'percentage' ? 100 : model.value.maxValue)
const numericAssetId = computed(() => {
  const value = Number(model.value.pointer.assetId)
  return Number.isFinite(value) ? value : undefined
})

const patch = (next: Record<string, any>) => {
  if (props.applyPatch) return props.applyPatch(next)
  if (props.element) return elementManager.updateElement(props.element, next)
}
const patchPointer = (next: Partial<SubDialPointerConfig>) => patch({ pointer: { ...model.value.pointer, ...next } })

const changeRangeMode = (value: unknown) => {
  try {
    rangeError.value = ''
    patch(buildSubDialRangePatch(value as SubDialRangeMode, model.value.minValue, model.value.maxValue))
  } catch (error) {
    rangeError.value = error instanceof Error ? error.message : String(error)
  }
}
const changeCustomRange = (key: 'minValue' | 'maxValue', value: unknown) => {
  try {
    const minValue = key === 'minValue' ? Number(value) : model.value.minValue
    const maxValue = key === 'maxValue' ? Number(value) : model.value.maxValue
    rangeError.value = ''
    patch(buildSubDialRangePatch('custom', minValue, maxValue))
  } catch (error) {
    rangeError.value = t('subDial.invalidRange')
  }
}
const selectPointerAsset = (url: string, asset: any) => {
  const assetPatch = buildSubDialPointerAssetPatch(url, asset)
  if (!assetPatch.imageUrl) {
    ElMessage.error(t('subDial.assetLoadFailed'))
    return
  }
  patchPointer(assetPatch)
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';
.sub-dial-settings { display: grid; gap: 12px; }
.settings-card { padding: 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.settings-card h3 { margin: 0 0 12px; }
.settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
</style>
