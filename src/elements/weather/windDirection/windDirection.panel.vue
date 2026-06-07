<template>
  <div class="wind-direction-properties">
    <el-form label-position="left" label-width="120px">

      <el-form-item :label="t('elementSettings.windIcon')">
        <AssetPicker
          :selected-url="imageUrl"
          :selected-asset-id="assetId"
          asset-type="windDirection"
          :on-select="handleAssetSelect"
          :on-upload="handleAssetUpload"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.centerX')">
        <el-input-number v-model="centerX" :min="0" :max="9999" @change="onPositionChange" />
      </el-form-item>

      <el-form-item :label="t('elementSettings.centerY')">
        <el-input-number v-model="centerY" :min="0" :max="9999" @change="onPositionChange" />
      </el-form-item>

      <el-form-item :label="t('elementSettings.windDegree')">
        <div class="wind-degree-row">
          <el-slider
            v-model="windDegree"
            :min="0"
            :max="360"
            :step="1"
            show-input
            @change="onWindDegreeChange"
            style="flex: 1"
          />
        </div>
      </el-form-item>

      <el-form-item :label="t('elementSettings.direction')">
        <span class="wind-label">{{ windDirectionLabel }}</span>
      </el-form-item>

    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement } from '@/types/element'
import AssetPicker from '@/components/asset-picker/index.vue'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import { useCanvasStore } from '@/stores/canvasStore'
import { useI18n } from '@/i18n'

const props = defineProps<{ 
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()
const canvasStore = useCanvasStore()
const { t } = useI18n()

const imageUrl = ref<string>('')
const assetId = ref<number | undefined>(undefined)
const centerX = ref<number>(0)
const centerY = ref<number>(0)
const windDegree = ref<number>(0)
const color = ref<string>('#FFFFFF')

const DIRECTION_LABELS = [
  { max: 22.5, label: 'N (北风)' },
  { max: 67.5, label: 'NE (东北风)' },
  { max: 112.5, label: 'E (东风)' },
  { max: 157.5, label: 'SE (东南风)' },
  { max: 202.5, label: 'S (南风)' },
  { max: 247.5, label: 'SW (西南风)' },
  { max: 292.5, label: 'W (西风)' },
  { max: 337.5, label: 'NW (西北风)' },
  { max: 360.1, label: 'N (北风)' },
]

const windDirectionLabel = computed<string>(() => {
  const deg = ((windDegree.value % 360) + 360) % 360
  return DIRECTION_LABELS.find((d) => deg < d.max)?.label ?? 'N (北风)'
})

const initFromCanvas = (): void => {
  const canvas = canvasStore.canvas
  if (!canvas) return
  const objects = canvas.getObjects() as unknown as Array<{ id?: string } & Record<string, unknown>>
  const obj = objects.find((o) => o.id === props.element?.id)
  if (!obj) return

  const url = (obj as Record<string, unknown>).imageUrl ?? (obj as Record<string, unknown>).imageSvg ?? (obj as Record<string, unknown>).src
  const deg = (obj as Record<string, unknown>).windDegree ?? (obj as Record<string, unknown>).angle
  const aid = (obj as Record<string, unknown>).assetId
  const c = (obj as Record<string, unknown>).color

  if (typeof url === 'string') imageUrl.value = url
  if (typeof aid === 'number') assetId.value = aid
  if (typeof (obj as Record<string, unknown>).left === 'number') centerX.value = (obj as Record<string, unknown>).left as number
  if (typeof (obj as Record<string, unknown>).top === 'number') centerY.value = (obj as Record<string, unknown>).top as number
  if (typeof deg === 'number') windDegree.value = ((deg % 360) + 360) % 360
  if (typeof c === 'string') color.value = c
}

onMounted(() => {
  initFromCanvas()
})

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const handleAssetSelect = (url: string, asset: AnalogAssetVO): void => {
  const svgUrl = asset.file?.url || url
  const previewUrl = asset.file?.previewUrl || url
  imageUrl.value = previewUrl
  assetId.value = asset.id
  applyUpdate({
    imageUrl: previewUrl,
    imageSvg: svgUrl,
    assetId: asset.id,
    color: color.value,
  })
}

const handleAssetUpload = (url: string, asset: AnalogAssetVO): void => {
  const svgUrl = asset.file?.url || url
  const previewUrl = asset.file?.previewUrl || url
  imageUrl.value = previewUrl
  assetId.value = asset.id
  applyUpdate({
    imageUrl: previewUrl,
    imageSvg: svgUrl,
    assetId: asset.id,
    color: color.value,
  })
}

const onPositionChange = (): void => {
  applyUpdate({
    left: centerX.value,
    top: centerY.value,
  })
}

const onWindDegreeChange = (val: number): void => {
  const deg = ((Number(val) % 360) + 360) % 360
  windDegree.value = deg
  applyUpdate({ windDegree: deg })
}
</script>

<style scoped>
.wind-direction-properties {
  padding: 16px;
}

.wind-degree-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.wind-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

::v-deep(.el-collapse-item__wrap) {
  overflow: visible;
}
</style>
