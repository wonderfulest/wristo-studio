<template>
  <div class="device-display-root">
    <div class="device-display-container" :class="{ mobile: isMobile }">
      <!-- Has Device -->
      <button
        v-if="currentDevice"
        type="button"
        class="device-info selected-state"
        :aria-label="`${t('device.selectDevice')}: ${currentDevice.displayName}`"
        @click="handleSelectDevice"
      >
        <div class="device-avatar">
          <img v-if="currentDevice.imageUrl" :src="currentDevice.imageUrl" :alt="currentDevice.displayName" />
          <div v-else class="device-fallback">W</div>
        </div>
        <div class="device-name" :style="{ maxWidth: props.nameMaxWidth + 'px' }">{{ currentDevice.displayName }}</div>
      </button>
      
      <!-- No Device -->
      <button v-else type="button" class="device-info no-device" :aria-label="t('device.selectDevice')" @click="handleSelectDevice">
        <div class="device-avatar">
          <div class="device-fallback">+</div>
        </div>
        <div class="device-name" :style="{ maxWidth: props.nameMaxWidth + 'px' }">{{ t('device.selectDevice') }}</div>
      </button>
    </div>
    
    <!-- Device Selector Modal -->
    <DeviceSelector 
      v-model="showSelector" 
      @device-selected="onDeviceSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import type { GarminDeviceVO } from '@/types/user'
import DeviceSelector from '@/components/common/DeviceSelector.vue'
import type { GarminDeviceVO as ApiGarminDeviceVO } from '@/api/device'
import { useI18n } from '@/i18n'

interface Props {
  selectedDevice?: GarminDeviceVO | null
  isMobile?: boolean
  showWhenEmpty?: boolean
  nameMaxWidth?: number
}

interface Emits {
  (e: 'select-device'): void
  (e: 'device-selected', device: GarminDeviceVO): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedDevice: null,
  isMobile: false,
  showWhenEmpty: true,
  nameMaxWidth: 120
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

const userStore = useUserStore()
const showSelector = ref(false)

// Current device computed property
const currentDevice = computed(() => {
  // Priority 1: User selected device (passed as prop)
  if (props.selectedDevice) {
    return props.selectedDevice
  }
  
  // Priority 3: User's device from profile (if logged in)
  if (userStore.userInfo?.device) {
    return userStore.userInfo.device
  }
  
  return null
})

// Handle select device click
const handleSelectDevice = () => {
  showSelector.value = true
  emit('select-device')
}

// Handle device selection from modal
const onDeviceSelected = (device: ApiGarminDeviceVO) => {
  showSelector.value = false
  
  // Emit device selected event
  emit('device-selected', device as unknown as GarminDeviceVO)
}

// Expose current device for parent components
defineExpose({
  currentDevice
})
</script>

<style scoped>
/* Desktop Device Display */
.device-display-root {
  display: inline-flex;
  max-width: 100%;
}

.device-display-container {
  display: flex;
  align-items: center;
  max-width: 100%;
}

.device-info {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
  max-width: 100%;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.device-info.selected-state {
  cursor: pointer;
}

.device-info:hover {
  border-color: rgba(15, 107, 104, 0.22);
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.08);
}

.device-info:focus-visible {
  outline: none;
  border-color: #0f6b68;
  box-shadow: var(--focus-ring);
}

.device-avatar {
  width: 26px;
  height: 26px;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 26px;
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
  font-size: 11px;
  font-weight: 800;
  color: #0f6b68;
  line-height: 1;
}

.device-name {
  font-size: 0.85rem;
  color: #1d1d1f;
  font-weight: 500;
  line-height: 1.25;
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* No Device State */
.device-info.no-device {
  cursor: pointer;
  border-color: #e5e7eb;
  background: #f8faf9;
  transition: all 0.2s ease;
}

.device-info.no-device:hover {
  border-color: rgba(15, 107, 104, 0.24);
  background: #edf6f5;
  box-shadow: 0 8px 18px rgba(15, 107, 104, 0.1);
}

.device-info.no-device .device-name {
  color: #86868b;
  font-weight: 400;
}

.device-info.no-device:hover .device-name {
  color: #0f6b68;
  font-weight: 500;
}

/* Mobile Device Display */
.device-display-container.mobile {
  padding: 16px 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.device-display-container.mobile .device-info {
  gap: 12px;
  padding: 12px 16px;
  background: #f8faf9;
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
  background: #f8faf9;
}

.device-display-container.mobile .device-info.no-device:hover {
  background: #edf6f5;
}
</style>
