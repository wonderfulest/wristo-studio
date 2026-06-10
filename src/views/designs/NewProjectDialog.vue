<template>
  <el-dialog
    v-model="internalVisible"
    :title="t('project.newProject')"
    width="400px"
    :close-on-click-modal="false"
    append-to-body
    :z-index="4000"
  >
    <div class="dialog-body">
      <div class="field-label">{{ t('project.projectName') }}</div>
      <el-input
        v-model="localName"
        :placeholder="t('project.enterProjectName')"
        maxlength="50"
        show-word-limit
      />

      <div class="field-label size-label">{{ t('project.device') }}</div>
      <button
        class="device-size-card"
        type="button"
        @click="openDeviceSelector"
      >
        <span class="device-size-icon">
          <img
            v-if="selectedDeviceImage"
            class="device-size-image"
            :src="selectedDeviceImage"
            :alt="selectedDeviceName"
          />
          <Icon v-else icon="material-symbols:watch-outline-rounded" />
        </span>
        <span class="device-size-copy">
          <span class="device-size-name">{{ selectedDeviceName }}</span>
          <span class="device-size-resolution">{{ selectedDeviceResolution }}</span>
        </span>
        <span class="device-size-action">{{ t('project.changeDevice') }}</span>
      </button>
    </div>

    <DeviceSelector
      v-model="deviceSelectorVisible"
      :auto-open-when-missing="false"
      :z-index="5000"
      @device-selected="handleDeviceSelected"
    />

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleOk">{{ t('common.ok') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import DeviceSelector from '@/components/common/DeviceSelector.vue'
import { useUserStore } from '@/stores/user'
import { useDesignStore } from '@/stores/designStore'
import type { GarminDeviceVO } from '@/api/device'
import { Icon } from '@iconify/vue'

const { t } = useI18n()
const userStore = useUserStore()
const designStore = useDesignStore()

const props = defineProps<{
  modelValue: boolean
  initialName: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', name: string): void
  (e: 'cancel'): void
}>()

const internalVisible = ref(props.modelValue)
const localName = ref(props.initialName)
const deviceSelectorVisible = ref(false)

const currentDevice = computed(() => userStore.userInfo?.device ?? null)

const selectedDeviceName = computed(() => {
  return currentDevice.value?.displayName || t('project.noDeviceSelected')
})

const selectedDeviceImage = computed(() => {
  return currentDevice.value?.imageUrl || currentDevice.value?.devicePng || ''
})

const selectedDeviceResolution = computed(() => {
  const width = Number(currentDevice.value?.resolutionWidth || designStore.designSpec.width || 454)
  const height = Number(currentDevice.value?.resolutionHeight || designStore.designSpec.height || width)
  return `${width} x ${height} pixels`
})

watch(
  () => props.modelValue,
  (val) => {
    internalVisible.value = val
    if (val) {
      // 每次打开时重置为传入的初始名称
      localName.value = props.initialName
    }
  }
)

watch(
  () => props.initialName,
  (val) => {
    if (!internalVisible.value) {
      localName.value = val
    }
  }
)

const handleCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const openDeviceSelector = () => {
  deviceSelectorVisible.value = true
}

const handleDeviceSelected = (device: GarminDeviceVO) => {
  const width = Number(device.resolutionWidth || 0)
  const height = Number(device.resolutionHeight || 0)
  if (width && height) {
    designStore.setDesignSize(width, height)
  }
}

const handleOk = () => {
  if (!currentDevice.value?.deviceId) {
    openDeviceSelector()
    return
  }
  emit('confirm', localName.value)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  font-size: 13px;
  color: var(--studio-text-muted);
  margin-bottom: 4px;
}

.size-label {
  margin-top: 8px;
}

.device-size-card {
  width: 100%;
  min-height: 72px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface);
  color: var(--studio-text);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.device-size-card:hover,
.device-size-card:focus-visible {
  border-color: var(--studio-border-strong);
  box-shadow: var(--studio-shadow-sm);
  background: var(--studio-surface-soft);
  outline: none;
}

.device-size-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--studio-radius-md);
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-size: 23px;
  overflow: hidden;
}

.device-size-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.device-size-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-size-name {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.25;
  color: var(--studio-text);
  overflow-wrap: anywhere;
}

.device-size-resolution {
  font-size: 12px;
  line-height: 1.2;
  color: var(--studio-text-muted);
}

.device-size-action {
  color: var(--studio-primary);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 520px) {
  .device-size-card {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .device-size-action {
    grid-column: 2;
  }
}
</style>
