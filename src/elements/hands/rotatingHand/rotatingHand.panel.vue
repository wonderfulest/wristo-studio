<template>
  <div class="settings-section rotating-hand-settings">
    <h3>{{ t('rotatingHand.title') }}</h3>
    <el-form label-position="top">
      <section class="settings-card">
        <h4>{{ t('rotatingHand.data') }}</h4>
        <el-form-item :label="t('rotatingHand.progressMode')">
          <el-segmented
            :model-value="model.progressMode"
            :options="progressOptions"
            @change="changeProgressMode($event as RotatingHandDialMode)"
          />
        </el-form-item>
        <DialPropertyField
          :model-value="model.dialProperty"
          :mode="model.progressMode"
          @change="patch({ dialProperty: $event })"
        />
        <el-alert v-if="bindingIssue" :title="bindingIssue" type="error" :closable="false" show-icon />
        <el-form-item v-if="model.progressMode === 'direction'" :label="t('rotatingHand.previewBearing')">
          <el-slider
            :model-value="model.previewBearing"
            :min="0"
            :max="359"
            :step="1"
            show-input
            @input="patch({ previewBearing: Number($event) })"
          />
        </el-form-item>
        <el-form-item v-else :label="t('rotatingHand.previewProgress')">
          <el-slider
            :model-value="model.previewProgress"
            :min="0"
            :max="100"
            :step="1"
            show-input
            @input="patch({ previewProgress: Number($event) })"
          />
        </el-form-item>
      </section>

      <section class="settings-card">
        <h4>{{ t('rotatingHand.rotation') }}</h4>
        <div class="settings-grid">
          <el-form-item v-if="model.progressMode === 'direction'">
            <template #label><AngleHelpLabel :label="t('rotatingHand.northAngle')" /></template>
            <el-input-number :model-value="model.northAngle" @change="patch({ northAngle: Number($event) })" />
          </el-form-item>
          <el-form-item v-if="model.progressMode !== 'direction'">
            <template #label><AngleHelpLabel :label="t('elementSettings.startAngle')" /></template>
            <el-input-number :model-value="model.startAngle" @change="patch({ startAngle: Number($event) })" />
          </el-form-item>
          <el-form-item v-if="model.progressMode !== 'direction'">
            <template #label><AngleHelpLabel :label="t('elementSettings.endAngle')" /></template>
            <el-input-number :model-value="model.endAngle" @change="patch({ endAngle: Number($event) })" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.direction')">
            <el-switch
              :model-value="model.counterClockwise"
              :active-text="t('rotatingHand.counterClockwise')"
              :inactive-text="t('rotatingHand.clockwise')"
              @change="patch({ counterClockwise: Boolean($event) })"
            />
          </el-form-item>
          <el-form-item v-if="model.progressMode !== 'direction'" :label="t('rotatingHand.outOfRange')">
            <el-select
              :model-value="model.outOfRangeBehavior"
              @change="patch({ outOfRangeBehavior: $event as RotatingHandOutOfRangeBehavior })"
            >
              <el-option :label="t('rotatingHand.clamp')" value="clamp" />
              <el-option :label="t('rotatingHand.hide')" value="hide" />
            </el-select>
          </el-form-item>
        </div>
      </section>

      <section class="settings-card">
        <h4>{{ t('rotatingHand.pointerAsset') }}</h4>
        <AssetPicker
          :selected-url="model.imageUrl || undefined"
          :selected-asset-id="numericAssetId"
          asset-type="hour"
          :on-select="selectAsset"
          :on-upload="selectAsset"
        />
      </section>

      <section class="settings-card">
        <h4>{{ t('rotatingHand.positionAndPivot') }}</h4>
        <HandGeometrySettings :model="model" @update="patch" />
      </section>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import AssetPicker from '@/components/asset-picker/index.vue'
import DialPropertyField from '@/elements/common/settings/DialPropertyField.vue'
import AngleHelpLabel from '@/elements/common/settings/AngleHelpLabel.vue'
import HandGeometrySettings from '@/elements/hands/common/HandGeometrySettings.vue'
import { usePropertiesStore } from '@/stores/properties'
import { useI18n } from '@/i18n'
import type {
  RotatingHandElementConfig,
  RotatingHandDialMode,
  RotatingHandOutOfRangeBehavior,
} from '@/types/elements'
import { resolveRotatingHandBindingIssue } from './rotatingHand.binding'

const props = defineProps<{
  element?: any
  config?: RotatingHandElementConfig | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()
const propertiesStore = usePropertiesStore()
const model = computed(() => (props.config ?? props.element) as RotatingHandElementConfig)
const progressOptions = computed(() => [
  { label: t('rotatingHand.goal'), value: 'goal' },
  { label: t('rotatingHand.range'), value: 'range' },
  { label: t('rotatingHand.directionMode'), value: 'direction' },
])
const bindingIssue = computed(() => resolveRotatingHandBindingIssue(
  model.value,
  propertiesStore.allProperties[model.value.dialProperty] as any,
))
const numericAssetId = computed(() => {
  const value = Number(model.value.assetId)
  return Number.isFinite(value) && value > 0 ? value : undefined
})

function patch(next: Record<string, any>): void {
  if (props.applyPatch) {
    props.applyPatch(next)
    return
  }
  if (props.element) void elementManager.updateElement(props.element, next)
}

function changeProgressMode(mode: RotatingHandDialMode): void {
  patch({ progressMode: mode, dialProperty: '' })
}

function selectAsset(url: string, asset: any): void {
  const sourceUrl = asset?.file?.url || asset?.file?.previewUrl || url
  patch({ imageUrl: sourceUrl, assetId: asset?.id ?? null })
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.settings-card + .settings-card {
  margin-top: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
</style>
