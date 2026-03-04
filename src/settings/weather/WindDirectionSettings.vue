<template>
  <div class="wind-direction-properties">
    <el-form label-position="left" label-width="120px">

      <el-form-item label="风向图标">
        <AssetPicker
          :selected-url="imageUrl"
          :selected-asset-id="assetId"
          asset-type="windDirection"
          :on-select="handleAssetSelect"
          :on-upload="handleAssetUpload"
        />
      </el-form-item>

      <el-form-item label="Width">
        <el-input-number v-model="imgWidth" :min="1" :max="2000" @change="onSizeChange" />
      </el-form-item>

      <el-form-item label="Height">
        <el-input-number v-model="imgHeight" :min="1" :max="2000" @change="onSizeChange" />
      </el-form-item>

      <el-form-item label="Center X">
        <el-input-number v-model="centerX" :min="0" :max="9999" @change="onPositionChange" />
      </el-form-item>

      <el-form-item label="Center Y">
        <el-input-number v-model="centerY" :min="0" :max="9999" @change="onPositionChange" />
      </el-form-item>

      <el-form-item label="Wind Degree">
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

      <el-form-item label="Direction">
        <span class="wind-label">{{ windDirectionLabel }}</span>
      </el-form-item>

    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWindDirectionStore } from '@/stores/elements/weather/windDirectionElement'
import type { FabricElement } from '@/types/element'
import AssetPicker from '@/components/asset-picker/index.vue'
import type { AnalogAssetVO } from '@/types/api/analog-asset'

const props = defineProps<{ element: FabricElement }>()

const windDirectionStore = useWindDirectionStore()

const imageUrl = ref<string>('')
const assetId = ref<number | undefined>(undefined)
const imgWidth = ref<number>(60)
const imgHeight = ref<number>(120)
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
  const canvas = windDirectionStore.baseStore.canvas
  if (!canvas) return
  const obj = (canvas.getObjects() as Array<{ id?: string } & Record<string, unknown>>)
    .find((o) => o.id === props.element.id)
  if (!obj) return

  const url = (obj as Record<string, unknown>).windImageUrl
  const w = (obj as Record<string, unknown>).windWidth ?? (obj as Record<string, unknown>).width
  const h = (obj as Record<string, unknown>).windHeight ?? (obj as Record<string, unknown>).height
  const deg = (obj as Record<string, unknown>).windDegree ?? (obj as Record<string, unknown>).angle
  const aid = (obj as Record<string, unknown>).assetId
  const c = (obj as Record<string, unknown>).color

  if (typeof url === 'string') imageUrl.value = url
  if (typeof aid === 'number') assetId.value = aid
  if (typeof w === 'number') imgWidth.value = w
  if (typeof h === 'number') imgHeight.value = h
  if (typeof (obj as Record<string, unknown>).left === 'number') centerX.value = (obj as Record<string, unknown>).left as number
  if (typeof (obj as Record<string, unknown>).top === 'number') centerY.value = (obj as Record<string, unknown>).top as number
  if (typeof deg === 'number') windDegree.value = ((deg % 360) + 360) % 360
  if (typeof c === 'string') color.value = c
}

onMounted(() => {
  initFromCanvas()
})

const handleAssetSelect = (url: string, asset: AnalogAssetVO): void => {
  const sourceUrl = asset.file?.url || url
  imageUrl.value = sourceUrl
  assetId.value = asset.id
  windDirectionStore.updateElement(props.element, {
    imageUrl: sourceUrl,
    assetId: asset.id,
    color: color.value,
  })
}

const handleAssetUpload = (url: string, asset: AnalogAssetVO): void => {
  const sourceUrl = asset.file?.url || url
  imageUrl.value = sourceUrl
  assetId.value = asset.id
  windDirectionStore.updateElement(props.element, {
    imageUrl: sourceUrl,
    assetId: asset.id,
    color: color.value,
  })
}

const onColorChange = (): void => {
  windDirectionStore.updateElement(props.element, {
    color: color.value,
  })
}

const onSizeChange = (): void => {
  windDirectionStore.setImageSize(props.element, imgWidth.value, imgHeight.value)
  windDirectionStore.updateElement(props.element, {
    width: imgWidth.value,
    height: imgHeight.value,
  })
}

const onPositionChange = (): void => {
  windDirectionStore.updateElement(props.element, {
    left: centerX.value,
    top: centerY.value,
  })
}

const onWindDegreeChange = (val: number): void => {
  const deg = ((Number(val) % 360) + 360) % 360
  windDegree.value = deg
  windDirectionStore.setWindDegree(props.element, deg)
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
