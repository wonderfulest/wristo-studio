<template>
  <div class="device-display-container" :class="{ mobile: isMobile }">
    <!-- Has Device -->
    <div v-if="currentDevice" class="device-info selected-state" @click="handleSelectDevice">
      <div class="device-avatar">
        <img v-if="currentDevice.imageUrl" :src="currentDevice.imageUrl" :alt="currentDevice.displayName" />
        <div v-else class="device-fallback">⌚️</div>
      </div>
      <div class="device-name">{{ currentDevice.displayName }}</div>
    </div>
    
    <!-- No Device -->
    <div v-else class="device-info no-device" @click="handleSelectDevice">
      <div class="device-avatar">
        <div class="device-fallback">📱</div>
      </div>
      <div class="device-name">Select Device</div>
    </div>
  </div>
  
  <!-- Device Selector Modal -->
  <DeviceSelector 
    v-model="showSelector" 
    @device-selected="onDeviceSelected"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import type { GarminDeviceVO } from '@/types/user'
import DeviceSelector from './DeviceSelector.vue'
import type { GarminDeviceVO as ApiGarminDeviceVO } from '@/api/device'

interface Props {
  isMobile?: boolean
  showWhenEmpty?: boolean
}

interface Emits {
  (e: 'select-device'): void
  (e: 'device-selected', device: GarminDeviceVO): void
}

const props = withDefaults(defineProps<Props>(), {
  isMobile: false,
  showWhenEmpty: true,
})

const emit = defineEmits<Emits>()

const userStore = useUserStore()
const showSelector = ref(false)

// 当前设备仅来源于 userStore
const currentDevice = computed(() => {
  return userStore.userInfo?.device ?? null
})

// Handle select device click
const handleSelectDevice = () => {
  showSelector.value = true
  emit('select-device')
}

// Handle device selection from modal
const onDeviceSelected = (device: ApiGarminDeviceVO) => {
  showSelector.value = false
  // Emit device selected event，便于父组件如 AppHeader 监听
  emit('device-selected', device as GarminDeviceVO)
}

// Expose current device for parent components
// 以及方法 openSelector 以便父组件主动打开选择器
defineExpose({
  currentDevice,
  openSelector: () => {
    showSelector.value = true
  },
})
</script>

<style scoped>
/* Desktop Device Display */
.device-display-container {
  display: flex;
  align-items: center;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.device-info.selected-state {
  cursor: pointer;
}

.device-info:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.device-avatar {
  width: 24px;
  height: 24px;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 24px;
}

.device-avatar img {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  padding: 2px;
  display: block;
  background: #fff;
}

.device-fallback {
  font-size: 12px;
  line-height: 1;
}

.device-name {
  font-size: 0.85rem;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  font-weight: 500;
}

/* No Device State */
.device-info.no-device {
  cursor: pointer;
  border-color: #d1d5db;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.device-info.no-device:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.device-info.no-device .device-name {
  color: #6b7280;
  font-weight: 400;
}

.device-info.no-device:hover .device-name {
  color: #3b82f6;
  font-weight: 500;
}

/* Mobile Device Display */
.device-display-container.mobile {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.device-display-container.mobile .device-info {
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.device-display-container.mobile .device-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex: 0 0 32px;
}

.device-display-container.mobile .device-avatar img {
  padding: 3px;
}

.device-display-container.mobile .device-fallback {
  font-size: 16px;
}

.device-display-container.mobile .device-name {
  font-size: 1rem;
  font-weight: 500;
  flex: 1;
  max-width: none;
}

/* Mobile No Device State */
.device-display-container.mobile .device-info.no-device {
  background: #f3f4f6;
}

.device-display-container.mobile .device-info.no-device:hover {
  background: #e5f3ff;
}
</style>
