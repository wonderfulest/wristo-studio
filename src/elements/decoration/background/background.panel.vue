<template>
  <div class="settings-section">
    <h3>背景设置</h3>

    <div class="setting-item">
      <label>Background Image</label>
      <ImageUpload
        :model-value="currentImageId"
        :preview-url="currentImageUrl"
        :aspect-code="IMAGE_ASPECT_CODE.BACKGROUND"
        @update:modelValue="handleImageIdChange"
        @uploaded="handleImageUploaded"
      />
    </div>

    <ThemeRuleSettings v-if="appId > 0" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { FabricElement } from '@/types/element'
import * as elementManager from '@/engine/managers/elementManager'
import { IMAGE_ASPECT_CODE } from '@/stores/common'
import { useBaseStore } from '@/stores/baseStore'
import ThemeRuleSettings from '@/components/panels/settings/ThemeRuleSettings.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'

const baseStore = useBaseStore()

const props = defineProps<{
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()

const appId = computed(() => baseStore.appId)

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

onMounted(() => {
  // no-op
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

const currentImageId = computed(() => {
  const raw = currentModel.value as any
  return raw.imageId ?? raw.wristoImageId ?? undefined
})

const currentImageUrl = computed(() => {
  const raw = currentModel.value as any
  return raw.imageUrl ?? raw.wristoImageUrl ?? ''
})

const handleImageIdChange = (id: any) => {
  if (!id) {
    applyUpdate({ imageId: null, imageUrl: '' })
  }
}

const handleImageUploaded = (img: any) => {
  if (!img) return
  const url =
    img.url || img.previewUrl || (img.formats && (img.formats.medium?.url || img.formats.thumbnail?.url)) || ''
  applyUpdate({ imageUrl: url || '', imageId: img.id || null })
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.setting-item {
  margin-bottom: 16px;
}
</style>
