<template>
  <div class="settings-section sub-dial-settings">
    <el-form label-position="top">
      <section class="settings-card">
        <h3>{{ t('subDial.data') }}</h3>
        <DataPropertyField :model-value="model.progressProperty" :label="t('subDial.dataItem')" :required="false" @change="patch({ progressProperty: $event })" />
        <el-form-item :label="t('subDial.progressMode')">
          <el-segmented :model-value="model.progressMode" :options="progressOptions" @change="patch({ progressMode: $event })" />
        </el-form-item>
        <div v-if="model.progressMode === 'custom'" class="settings-grid">
          <el-form-item :label="t('subDial.minimum')">
            <el-input-number :model-value="model.customMin" @change="changeCustomRange('customMin', $event)" />
          </el-form-item>
          <el-form-item :label="t('subDial.maximum')" :error="rangeError">
            <el-input-number :model-value="model.customMax" @change="changeCustomRange('customMax', $event)" />
          </el-form-item>
        </div>
        <el-form-item :label="t('subDial.previewValue')">
          <el-input-number :model-value="model.previewValue" @change="patch({ previewValue: Number($event) })" />
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

      <section class="dial-subsection">
        <h4>{{ t('subDial.ticks') }}</h4>
        <div class="settings-grid">
          <el-form-item :label="t('subDial.majorTicks')">
            <el-input-number :model-value="model.majorTicks" :min="0" :max="60" @change="patch({ majorTicks: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.minorTicks')">
            <el-input-number :model-value="model.minorTicks" :min="0" :max="120" @change="patch({ minorTicks: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('subDial.showTickLabels')"><el-switch :model-value="model.showTickLabels" @change="patch({ showTickLabels: Boolean($event) })" /></el-form-item>
          <el-form-item :label="t('subDial.majorColor')">
            <ColorPicker :model-value="model.majorTickColor" @change="patch({ majorTickColor: $event })" />
          </el-form-item>
          <el-form-item :label="t('subDial.minorColor')">
            <ColorPicker :model-value="model.minorTickColor" @change="patch({ minorTickColor: $event })" />
          </el-form-item>
        </div>
      </section>

      <section class="dial-subsection">
        <h4>{{ t('subDial.pointer') }}</h4>
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

      <section class="dial-subsection">
        <h4>{{ t('subDial.centerCap') }}</h4>
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

      <section class="settings-card"><h3>{{ t('subDial.content') }}</h3>
        <el-segmented :model-value="selectedKey" :options="contentOptions" @change="selectContent($event as SubDialContentKey)" />
        <div class="settings-grid content-fields">
          <el-form-item :label="t('common.enabled')"><el-switch :model-value="selectedItem.visible" @change="patchItem({ visible: Boolean($event) })" /></el-form-item>
          <el-form-item v-for="field in ['x','y','rotation','scale']" :key="field" :label="field"><el-input-number :model-value="selectedItem[field]" :step="0.05" @change="patchItem({ [field]: Number($event) })" /></el-form-item>
          <el-form-item :label="t('elementSettings.color')"><ColorPicker :model-value="selectedItem.color" @change="patchItem({ color: $event })" /></el-form-item>
          <template v-if="selectedKey === 'icon'"><el-form-item :label="t('subDial.displayType')"><el-select :model-value="selectedItem.displayType" @change="patchItem({ displayType: $event })"><el-option v-for="o in displayOptions" :key="o.value" :label="o.label" :value="o.value" /></el-select></el-form-item><el-form-item :label="t('elementSettings.size')"><el-input-number :model-value="selectedItem.size" @change="patchItem({ size: Number($event) })" /></el-form-item></template>
          <template v-else><el-form-item v-for="field in ['font','prefix','suffix']" :key="field" :label="t(`subDial.${field}`)"><el-input :model-value="selectedItem[field]" @change="patchItem({ [field]: String($event) })" /></el-form-item><el-form-item :label="t('elementSettings.fontSize')"><el-input-number :model-value="selectedItem.fontSize" @change="patchItem({ fontSize: Number($event) })" /></el-form-item><el-form-item :label="t('elementSettings.textAlign')"><el-select :model-value="selectedItem.textAlign" @change="patchItem({ textAlign: $event })"><el-option v-for="v in ['left','center','right']" :key="v" :label="v" :value="v" /></el-select></el-form-item><el-form-item v-if="['value','goalValue','percentage'].includes(selectedKey)" :label="t('subDial.decimals')"><el-input-number :model-value="selectedItem.decimals" :min="0" :max="6" @change="patchItem({ decimals: Number($event) })" /></el-form-item></template>
        </div>
      </section>
      <section class="settings-card"><h3>{{ t('subDial.layout') }}</h3><div class="button-row"><el-button v-for="o in presetOptions" :key="o.value" @click="applyPreset(o.value)">{{ o.label }}</el-button></div><div class="button-row"><el-button :disabled="!layoutEditor || !element" @click="editLayout">{{ t('subDial.editInnerLayout') }}</el-button><el-button :disabled="!canAlign" @click="layoutEditor?.center('horizontal')">{{ t('subDial.centerHorizontal') }}</el-button><el-button :disabled="!canAlign" @click="layoutEditor?.center('vertical')">{{ t('subDial.centerVertical') }}</el-button><el-button :disabled="!canAlign" @click="layoutEditor?.resetSelectedPosition()">{{ t('subDial.resetPosition') }}</el-button></div></section>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as elementManager from '@/engine/managers/elementManager'
import AssetPicker from '@/components/asset-picker/index.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import DataPropertyField from '@/elements/common/settings/DataPropertyField.vue'
import type { SubDialContentKey, SubDialElementConfig, SubDialPointerConfig } from '@/types/elements/subDial'
import { useI18n } from '@/i18n'
import { buildContentItemPatch, buildLayoutPresetPatch, buildSubDialPointerAssetPatch } from './subDial.panelModel'
import type { SubDialLayoutPreset } from './subDial.layout'
import { subscribeSubDialLayoutEditor } from './subDial.plugin'
import type { SubDialLayoutEditor } from './SubDialLayoutEditor'

const props = defineProps<{
  element?: any
  config?: SubDialElementConfig | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()
const model = computed(() => (props.config ?? props.element) as SubDialElementConfig)
const rangeError = ref('')
const selectedKey = ref<SubDialContentKey>('value')
const layoutEditor = ref<SubDialLayoutEditor | null>(null)
let stopSelection: () => void = () => undefined
const stopEditor = subscribeSubDialLayoutEditor((editor) => {
  stopSelection()
  layoutEditor.value = editor
  stopSelection = editor?.subscribeSelection((key, group) => {
    if (key && (!props.element || group === props.element)) selectedKey.value = key
  }) ?? (() => undefined)
})
onBeforeUnmount(() => { stopSelection(); stopEditor() })
const progressOptions = computed(() => ['auto', 'goal', 'range', 'custom'].map(value => ({ label: t(`subDial.${value}`), value })))
const pointerOptions = computed(() => [
  { label: t('subDial.line'), value: 'line' },
  { label: t('subDial.triangle'), value: 'triangle' },
  { label: t('subDial.image'), value: 'image' },
])
const contentOptions = computed(() => ([['icon','icon'],['label','label'],['value','value'],['unit','unit'],['goalValue','goalRange'],['percentage','percentage']] as const).map(([value, label]) => ({ value, label: t(`subDial.${label}`) })))
const displayOptions = computed(() => ['auto', 'mip', 'amoled'].map(value => ({ value, label: t(`subDial.${value}`) })))
const presetOptions = computed(() => ([['classic','classic'],['compact','compact'],['goalFocus','goalFocus']] as const).map(([value, label]) => ({ value, label: t(`subDial.${label}`) })))
const selectedItem = computed<any>(() => model.value.content[selectedKey.value])
const canAlign = computed(() => Boolean(layoutEditor.value?.isEditing(props.element) && layoutEditor.value.getSelectedKey()))
const numericAssetId = computed(() => {
  const value = Number(model.value.pointer.assetId)
  return Number.isFinite(value) ? value : undefined
})

const patch = (next: Record<string, any>) => {
  if (props.applyPatch) return props.applyPatch(next)
  if (props.element) return elementManager.updateElement(props.element, next)
}
const patchPointer = (next: Partial<SubDialPointerConfig>) => patch({ pointer: { ...model.value.pointer, ...next } })
const patchItem = (next: Record<string, any>) => patch(buildContentItemPatch(model.value.content, selectedKey.value, next as any))
const selectContent = (key: SubDialContentKey) => {
  selectedKey.value = key
  if (props.element && layoutEditor.value?.isEditing(props.element)) layoutEditor.value.select(key)
}
const editLayout = () => { if (props.element && layoutEditor.value?.enter(props.element)) layoutEditor.value.select(selectedKey.value) }
const applyPreset = (preset: SubDialLayoutPreset) => patch(buildLayoutPresetPatch(model.value.content, preset))

const changeCustomRange = (key: 'customMin' | 'customMax', value: unknown) => {
  try {
    const minValue = key === 'customMin' ? Number(value) : model.value.customMin
    const maxValue = key === 'customMax' ? Number(value) : model.value.customMax
    rangeError.value = ''
    if (maxValue <= minValue) throw new Error('invalid range')
    patch({ [key]: Number(value) })
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
.dial-subsection { padding: 8px 12px; }
.dial-subsection h4 { margin: 0 0 8px; }
.settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
.content-fields { margin-top: 12px; }
.button-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
</style>
