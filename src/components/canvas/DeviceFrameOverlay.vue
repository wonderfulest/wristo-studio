<template>
  <div
    v-if="shouldRender"
    class="device-frame-overlay"
    aria-hidden="true"
  >
    <img
      class="device-frame-image"
      :class="{ 'device-frame-image-loading': !frameStyle }"
      :src="devicePng"
      :alt="deviceAlt"
      :style="frameStyle || undefined"
      draggable="false"
      @load="handleImageLoad"
      @error="handleImageError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDesignStore } from '@/stores/designStore'
import { useEditorStore } from '@/stores/editorStore'
import { useUserStore } from '@/stores/user'
import { getDeviceDetailByDeviceId, type GarminDeviceVO } from '@/api/device'

const props = withDefaults(defineProps<{
  canvasOffset?: number
}>(), {
  canvasOffset: 0,
})

const designStore = useDesignStore()
const editorStore = useEditorStore()
const userStore = useUserStore()

const naturalSize = ref({ width: 0, height: 0 })
const imageFailed = ref(false)
const detailDevice = ref<GarminDeviceVO | null>(null)
let detailRequestSeq = 0

const currentDevice = computed(() => userStore.userInfo?.device ?? null)
const resolvedDevice = computed(() => detailDevice.value ?? currentDevice.value)
const devicePng = computed(() => resolvedDevice.value?.devicePng || '')
const deviceAlt = computed(() => resolvedDevice.value?.displayName || 'Garmin device frame')
const displayLocation = computed(() => resolvedDevice.value?.simulator?.display?.location ?? null)

const validLocation = computed(() => {
  const location = displayLocation.value
  const x = Number(location?.x)
  const y = Number(location?.y)
  const width = Number(location?.width)
  const height = Number(location?.height)

  if (![x, y, width, height].every(Number.isFinite)) return null
  if (width <= 0 || height <= 0) return null

  return { x, y, width, height }
})

const shouldRender = computed(() => {
  return Boolean(editorStore.showDeviceFrame && devicePng.value && validLocation.value && !imageFailed.value)
})

const frameStyle = computed(() => {
  const location = validLocation.value
  const imageWidth = naturalSize.value.width
  const imageHeight = naturalSize.value.height
  if (!location || imageWidth <= 0 || imageHeight <= 0) return null

  const designWidth = Number(designStore.designSpec.width || location.width)
  const designHeight = Number(designStore.designSpec.height || location.height)
  const zoom = Number(editorStore.zoomLevel || 1)
  const scaleX = designWidth / location.width
  const scaleY = designHeight / location.height

  return {
    left: `${props.canvasOffset - location.x * scaleX * zoom}px`,
    top: `${props.canvasOffset - location.y * scaleY * zoom}px`,
    width: `${imageWidth * scaleX * zoom}px`,
    height: `${imageHeight * scaleY * zoom}px`,
  }
})

watch(devicePng, () => {
  naturalSize.value = { width: 0, height: 0 }
  imageFailed.value = false
})

watch(
  () => currentDevice.value?.deviceId || '',
  async (deviceId) => {
    const requestSeq = ++detailRequestSeq
    detailDevice.value = null
    if (!deviceId || validLocation.value) return

    try {
      const deviceDetail = await getDeviceDetailByDeviceId(deviceId)
      if (requestSeq !== detailRequestSeq) return
      detailDevice.value = {
        ...currentDevice.value,
        ...deviceDetail,
        displayName: currentDevice.value?.displayName || deviceDetail.displayName,
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[DeviceFrameOverlay] Failed to load Garmin device detail', deviceId, error)
      }
    }
  },
  { immediate: true },
)

const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement | null
  naturalSize.value = {
    width: Number(img?.naturalWidth || 0),
    height: Number(img?.naturalHeight || 0),
  }
  imageFailed.value = false
}

const handleImageError = () => {
  naturalSize.value = { width: 0, height: 0 }
  imageFailed.value = true
  if (import.meta.env.DEV) {
    console.warn('[DeviceFrameOverlay] Failed to load device frame image', devicePng.value)
  }
}
</script>

<style scoped>
.device-frame-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 0;
}

.device-frame-image {
  position: absolute;
  display: block;
  max-width: none;
  max-height: none;
  user-select: none;
  pointer-events: none;
}

.device-frame-image-loading {
  visibility: hidden;
}
</style>
