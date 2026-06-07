<template>
  <div class="device-display-container" :class="{ mobile: isMobile }">
    <!-- Has Device -->
    <div v-if="currentDevice" class="device-info selected-state" @click="handleSelectDevice">
      <div class="device-avatar">
        <img v-if="currentDevice.imageUrl" :src="currentDevice.imageUrl" :alt="currentDevice.displayName" />
        <Icon v-else class="device-fallback-icon" icon="material-symbols:watch-rounded" />
      </div>
      <div class="device-name">{{ currentDevice.displayName }}</div>
    </div>
    
    <!-- No Device -->
    <div v-else class="device-info no-device" @click="handleSelectDevice">
      <div class="device-avatar">
        <Icon class="device-fallback-icon" icon="material-symbols:watch-off-rounded" />
      </div>
      <div class="device-name">{{ t('device.selectDevice') }}</div>
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
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import type { GarminDeviceVO } from '@/types/user'
import DeviceSelector from './DeviceSelector.vue'
import type { GarminDeviceVO as ApiGarminDeviceVO } from '@/api/device'
import { useI18n } from '@/i18n'

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
const { t } = useI18n()

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
  min-height: 40px;
  padding: 5px 11px;
  background: var(--studio-surface-soft);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  box-shadow: none;
  transition: all 0.2s ease;
}

.device-info.selected-state {
  cursor: pointer;
}

.device-info:hover {
  border-color: var(--studio-border-strong);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
}

.device-avatar {
  width: 24px;
  height: 24px;
  aspect-ratio: 1 / 1;
  border-radius: var(--studio-radius-sm);
  overflow: hidden;
  background: var(--studio-canvas-shell);
  border: 1px solid var(--studio-border);
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
  background: var(--studio-canvas-shell);
}

.device-fallback-icon {
  width: 16px;
  height: 16px;
  color: var(--studio-text-muted);
}

.device-name {
  font-size: 0.85rem;
  color: var(--studio-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  font-weight: 500;
}

/* No Device State */
.device-info.no-device {
  cursor: pointer;
  border-color: var(--studio-border);
  background: var(--studio-surface-soft);
  transition: all 0.2s ease;
}

.device-info.no-device:hover {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
  box-shadow: var(--studio-shadow-sm);
}

.device-info.no-device .device-name {
  color: var(--studio-text-muted);
  font-weight: 400;
}

.device-info.no-device:hover .device-name {
  color: var(--studio-primary);
  font-weight: 500;
}

/* Mobile Device Display */
.device-display-container.mobile {
  padding: 16px 0;
  border-bottom: 1px solid var(--studio-border);
  margin-bottom: 16px;
}

.device-display-container.mobile .device-info {
  gap: 12px;
  padding: 12px 16px;
  background: var(--studio-surface-soft);
  border-radius: var(--studio-radius-md);
  border: 1px solid var(--studio-border);
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

.device-display-container.mobile .device-fallback-icon {
  width: 20px;
  height: 20px;
}

.device-display-container.mobile .device-name {
  font-size: 1rem;
  font-weight: 500;
  flex: 1;
  max-width: none;
}

/* Mobile No Device State */
.device-display-container.mobile .device-info.no-device {
  background: var(--studio-surface-soft);
}

.device-display-container.mobile .device-info.no-device:hover {
  background: var(--studio-primary-soft);
}
</style>
