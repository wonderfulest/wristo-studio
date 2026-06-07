<template>
  <el-dialog
    v-model="visible"
    :title="t('device.selectYourDevice')"
    width="min(880px, 95vw)"
    append-to-body
    :before-close="handleClose"
    :z-index="3000"
    class="device-selector-dialog"
  >
    <div class="device-selector-content">
      <!-- Search Bar -->
      <div v-if="!loading" class="search-row">
        <el-input
          v-model="query"
          :placeholder="t('device.searchDeviceName')"
          size="large"
          clearable
          :prefix-icon="Search"
          class="search-input xl"
        />
      </div>
      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>{{ t('device.loadingDevices') }}</span>
      </div>
      
      <!-- Device List -->
      <div v-else-if="filteredDevices.length > 0" class="device-list">
        <div
          v-for="device in filteredDevices"
          :key="device.displayKey"
          class="device-item"
          :class="{ selected: selectedDeviceKey === device.displayKey }"
          @click="selectDevice(device)"
        >
          <div class="device-avatar">
            <img v-if="device.imageUrl" :src="device.imageUrl" :alt="device.displayName" />
            <Icon v-else class="device-fallback" icon="material-symbols:watch-rounded" />
          </div>
          <div class="device-info">
            <div class="device-name">{{ device.displayName }}</div>
            <div v-if="device.deviceFamily" class="device-family">{{ device.deviceFamily }}</div>
          </div>
          <div class="device-check">
            <el-icon v-if="selectedDeviceKey === device.displayKey" class="check-icon"><Check /></el-icon>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="empty-state">
        <el-icon class="empty-icon"><Warning /></el-icon>
        <p>{{ t('device.noDevices') }}</p>
      </div>

      <!-- Auto Confirm Banner -->
      <div v-if="countdown !== null" class="auto-confirm-banner">
        <span>{{ t('device.autoSelecting', { seconds: countdown }) }}</span>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Check, Warning, Search } from '@element-plus/icons-vue'
import { Icon } from '@iconify/vue'
import { getDeviceList, getDeviceDetailByDeviceId, type GarminDeviceBaseVO, type GarminDeviceVO } from '@/api/device'
import { useUserStore } from '@/stores/user'
import { getUserInfo, updateMyInfo } from '@/api/wristo/auth'
import { useI18n } from '@/i18n'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'device-selected', device: GarminDeviceVO): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userStore = useUserStore()
const { t } = useI18n()

const visible = ref(false)
const loading = ref(false)
const confirmLoading = ref(false)
const deviceList = ref<GarminDeviceBaseVO[]>([])
const selectedDevice = ref<DisplayGarminDeviceBaseVO | null>(null)
const selectedDeviceKey = computed(() => selectedDevice.value?.displayKey || null)
const query = ref('')
const countdown = ref<number | null>(null)
let countdownTimer: number | null = null

interface DisplayGarminDeviceBaseVO extends GarminDeviceBaseVO {
  displayKey: string
  originalDisplayName: string
}

const displayDevices = computed(() => {
  return deviceList.value.flatMap(expandDeviceDisplayNames)
})

// Filtered list by fuzzy query
const filteredDevices = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return displayDevices.value
  return displayDevices.value.filter((d) => {
    const name = (d.displayName || '').toLowerCase()
    const originalName = (d.originalDisplayName || '').toLowerCase()
    const family = (d.deviceFamily || '').toLowerCase()
    // simple fuzzy: all query chars appear in order in name, or substring match on name/family
    const inOrder = (() => {
      let i = 0
      for (const ch of name) {
        if (ch === q[i]) i++
        if (i === q.length) return true
      }
      return false
    })()
    return name.includes(q) || originalName.includes(q) || family.includes(q) || inOrder
  })
})

// Watch for prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    visible.value = newValue
    if (newValue) {
      loadDeviceList()
    }
  }
)

// 当用户还没有绑定设备时，组件挂载后自动弹出设备选择对话框（同时只会有一个实例显示）
onMounted(() => {
  // 已经是可见状态时不再重复触发
  if (visible.value) return

  const currentDeviceId = (userStore.userInfo as any)?.device?.deviceId
  if (!currentDeviceId) {
    visible.value = true
    emit('update:modelValue', true)
    loadDeviceList()
  }
})

// Watch for visible changes
watch(visible, (newValue) => {
  emit('update:modelValue', newValue)
  if (!newValue) {
    // Reset state when dialog closes
    selectedDevice.value = null
    stopCountdown()
    countdown.value = null
  }
})

// Load device list
const loadDeviceList = async () => {
  loading.value = true
  try {
    const devices = await getDeviceList()
    deviceList.value = devices
  } catch (error) {
    console.error('Failed to load device list:', error)
    ElMessage.error('Failed to load devices')
  } finally {
    loading.value = false
  }
}

// Select device
const selectDevice = (device: DisplayGarminDeviceBaseVO) => {
  selectedDevice.value = device
  startCountdown()
}

// Confirm selection
const confirmSelection = async () => {
  if (!selectedDevice.value) return

  confirmLoading.value = true
  try {
    const selected = selectedDevice.value
    if (!selected.deviceId) {
      throw new Error('Selected Garmin device is missing deviceId')
    }
    // Get device details by Garmin deviceId so simulator.display.location is populated.
    const deviceDetail = await getDeviceDetailByDeviceId(selected.deviceId)
    const displayDeviceDetail = {
      ...deviceDetail,
      displayName: selected.displayName
    }

    // 调用后端接口更新当前用户设备
    await updateMyInfo({ deviceId: displayDeviceDetail.deviceId })

    // 重新拉取用户信息并更新到 userStore
    try {
      const res = await getUserInfo()
      if (res?.data) {
        userStore.setUserInfo({
          ...res.data,
          device: res.data.device
            ? {
                ...res.data.device,
                ...displayDeviceDetail,
                displayName: selected.displayName
              }
            : displayDeviceDetail
        })
      }
    } catch (e) {
      console.error('Failed to refresh user info after device update:', e)
    }

    // Emit selection event
    emit('device-selected', displayDeviceDetail)

    // Close dialog
    handleClose()

    ElMessage.success('Device selected successfully')
  } catch (error) {
    console.error('Failed to get device details:', error)
    ElMessage.error('Failed to get device details')
  } finally {
    confirmLoading.value = false
  }
}

// Handle dialog close
const handleClose = () => {
  stopCountdown()
  countdown.value = null
  visible.value = false
}

function startCountdown() {
  stopCountdown()
  countdown.value = 3
  countdownTimer = window.setInterval(async () => {
    if (countdown.value === null) return
    if (countdown.value <= 1) {
      stopCountdown()
      await confirmSelection()
      return
    }
    countdown.value = (countdown.value || 0) - 1
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function expandDeviceDisplayNames(device: GarminDeviceBaseVO): DisplayGarminDeviceBaseVO[] {
  const displayNames = splitDeviceDisplayName(device.displayName)
  return displayNames.map((displayName, index) => ({
    ...device,
    displayName,
    originalDisplayName: device.displayName,
    displayKey: `${device.id}:${index}:${displayName}`
  }))
}

function splitDeviceDisplayName(displayName: string): string[] {
  const parts = displayName.split('/').map((part) => part.trim()).filter(Boolean)
  if (parts.length <= 1) return [displayName]

  const prefix = inferDeviceDisplayPrefix(parts[0])
  return parts.map((part, index) => {
    if (index === 0 || !prefix || part.startsWith(prefix)) return part
    return `${prefix} ${part}`
  })
}

function inferDeviceDisplayPrefix(firstPart: string): string {
  const closingParenIndex = firstPart.lastIndexOf(')')
  if (closingParenIndex >= 0 && closingParenIndex < firstPart.length - 1) {
    return firstPart.slice(0, closingParenIndex + 1).trim()
  }

  const familyMatch = firstPart.match(/^(MARQ|Forerunner|fēnix|fenix|epix|Venu|vívoactive|vivoactive|Instinct|Approach|Descent|Enduro|tactix|quatix|D2)\b/i)
  return familyMatch?.[0] || ''
}

onBeforeUnmount(() => {
  stopCountdown()
})
</script>

<style scoped>
.device-selector-dialog :deep(.el-dialog__body) {
  padding: 16px 20px 20px;
}

.device-selector-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-row {
  margin-bottom: 4px;
}

.search-input.xl {
  width: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  color: var(--studio-text-muted);
  gap: 12px;
}

.loading-container .el-icon {
  font-size: 24px;
}

.device-list {
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--studio-border);
  background: var(--studio-surface);
  cursor: pointer;
  transition: all 0.15s ease;
}

.device-item:hover {
  border-color: var(--studio-border-strong);
  box-shadow: var(--studio-shadow-sm);
}

.device-item.selected {
  border-color: var(--studio-primary);
  box-shadow: 0 3px 10px rgba(15, 107, 104, 0.18);
  background: var(--studio-primary-soft);
}

.device-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--studio-surface-soft);
  border: 1px solid var(--studio-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 40px;
}

.device-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.device-fallback {
  width: 22px;
  height: 22px;
  color: var(--studio-text-muted);
}

.device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.device-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--studio-text);
  line-height: 1.2;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.device-family {
  font-size: 0.8rem;
  color: var(--studio-text-muted);
  line-height: 1.25;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.device-check {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  color: var(--studio-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  color: var(--studio-text-muted);
  gap: 8px;
}

.empty-icon {
  font-size: 26px;
}

.auto-confirm-banner {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-size: 12px;
  text-align: center;
}
</style>
