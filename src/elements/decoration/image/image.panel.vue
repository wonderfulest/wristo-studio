<template>
  <div class="image-properties">
    <el-form label-position="left" label-width="120px">
      <el-form-item :label="t('elementSettings.asset')">
        <AssetPicker
          :selected-url="imageUrl"
          :selected-asset-id="assetId"
          asset-type="image"
          :on-select="handleAssetSelect"
          :on-upload="handleAssetUpload"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement } from '@/types/element'
import AssetPicker from '@/components/asset-picker/index.vue'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import { useI18n } from '@/i18n'

const props = defineProps<{
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()

const { t } = useI18n()

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

const imageUrl = ref<string>('')
const assetId = ref<number | undefined>(undefined)

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const syncFromCanvas = (): void => {
  const obj = props.element as any
  if (!obj) return

  const url = (obj as any).imageUrl ?? (obj as any).src
  if (typeof url === 'string') imageUrl.value = url

  const aid = (obj as any).assetId
  if (typeof aid === 'number') assetId.value = aid
}

onMounted(() => {
  imageUrl.value = String(currentModel.value.imageUrl ?? '')
  assetId.value = typeof currentModel.value.assetId === 'number' ? currentModel.value.assetId : undefined
  syncFromCanvas()
})

watch(
  () => [props.element?.id, currentModel.value?.imageUrl, currentModel.value?.assetId],
  () => {
    imageUrl.value = String(currentModel.value.imageUrl ?? '')
    assetId.value = typeof currentModel.value.assetId === 'number' ? currentModel.value.assetId : undefined
    syncFromCanvas()
  },
)

const handleAssetSelect = (url: string, asset: AnalogAssetVO): void => {
  const pickUrl = asset.file?.previewUrl || asset.file?.url || url
  imageUrl.value = pickUrl
  assetId.value = asset.id
  applyUpdate({ imageUrl: pickUrl, assetId: asset.id })
}

const handleAssetUpload = (url: string, asset: AnalogAssetVO): void => {
  const pickUrl = asset.file?.previewUrl || asset.file?.url || url
  imageUrl.value = pickUrl
  assetId.value = asset.id
  applyUpdate({ imageUrl: pickUrl, assetId: asset.id })
}
</script>

<style scoped>
.image-properties {
  padding: 16px;
}
</style>
