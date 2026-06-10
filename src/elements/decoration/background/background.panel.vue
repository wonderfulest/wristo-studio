<template>
  <div class="settings-section">
    <h3>{{ t('editor.image') }} {{ t('nav.settings') }}</h3>

    <div class="setting-item">
      <label>{{ t('elementSettings.backgroundImage') }}</label>
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
import { useI18n } from '@/i18n'
import { DEFAULT_BACKGROUND_IMAGE_URL } from './background.constants'

const baseStore = useBaseStore()
const { t } = useI18n()

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
  if ((raw.imageUrl ?? raw.wristoImageUrl) === DEFAULT_BACKGROUND_IMAGE_URL) return undefined
  return raw.imageId ?? raw.wristoImageId ?? undefined
})

const currentImageUrl = computed(() => {
  const raw = currentModel.value as any
  const url = raw.imageUrl ?? raw.wristoImageUrl ?? ''
  return url === DEFAULT_BACKGROUND_IMAGE_URL ? '' : url
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
