<template>
  <header class="app-header">
    <div class="header-left">
      <div class="brand">
        <img src="@/assets/favicon.svg" alt="Wristo Studio" class="logo">
        <h1 class="brand-title">Wristo Studio</h1>
      </div>
      <nav class="header-nav">
        <a @click="showDesignerConfirm" class="nav-link">
          <Icon icon="material-symbols:edit-square" />
          New Design
        </a>
        <el-dialog v-model="designerDialogVisible" title="Confirm" width="30%">
          <span>Close current work and start a new design?</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="designerDialogVisible = false">Cancel</el-button>
              <el-button type="primary" @click="confirmNewDesign">Confirm</el-button>
            </span>
          </template>
        </el-dialog>
        <a @click="showDesignsListConfirm" class="nav-link">
          <Icon icon="material-symbols:list" />
          Designs List
        </a>
        <a @click="showFontsConfirm" class="nav-link">
          <Icon icon="material-symbols:font-download-outline" />
          Font Preview
        </a>
        <el-dialog v-model="designsListDialogVisible" title="Confirm" width="30%">
          <span>Close current work and open the designs list?</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="designsListDialogVisible = false">Cancel</el-button>
              <el-button type="primary" @click="confirmOpenDesignsList">Confirm</el-button>
            </span>
          </template>
        </el-dialog>
        <el-dialog v-model="fontsDialogVisible" title="Confirm" width="30%">
          <span>Close current work and open the font preview?</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="fontsDialogVisible = false">Cancel</el-button>
              <el-button type="primary" @click="confirmOpenFonts">Confirm</el-button>
            </span>
          </template>
        </el-dialog>
        <el-dialog v-model="devicesDialogVisible" title="Confirm" width="30%">
          <span>Close current work and open the devices?</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="devicesDialogVisible = false">Cancel</el-button>
              <el-button type="primary" @click="confirmOpenDevices">Confirm</el-button>
            </span>
          </template>
        </el-dialog>
        <el-dialog v-model="ticketsDialogVisible" title="Confirm" width="30%">
          <span>Close current work and open the tickets?</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="ticketsDialogVisible = false">Cancel</el-button>
              <el-button type="primary" @click="confirmOpenTickets">Confirm</el-button>
            </span>
          </template>
        </el-dialog>
      </nav>
    </div>

    <div class="app-info" v-if="route.path === '/design'">
      <el-input 
        type="text" 
        v-model="watchFaceName" 
        placeholder="Watch face name" 
        :input-style="{ border: 'none', background: 'transparent' }" 
      />
    </div>

    <DeviceDisplay 
      class="current-device-display"
      @select-device="handleDeviceSelect"
      @device-selected="onDeviceSelected"
    />

    <UserMenu />
  </header>
  <CreateDesignDialog ref="createDesignDialogRef" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import DeviceDisplay from '@/components/DeviceDisplay.vue'
import CreateDesignDialog from '../dialogs/CreateDesignDialog.vue'
import UserMenu from './UserMenu.vue'

const props = defineProps({
  // 其他需要保留的 props
})

const emit = defineEmits(['update:isDialogVisible'])

const router = useRouter()
const route = useRoute()
const baseStore = useBaseStore()
const messageStore = useMessageStore()
const userStore = useUserStore()

const designerDialogVisible = ref(false)
const designsListDialogVisible = ref(false)
const fontsDialogVisible = ref(false)
const devicesDialogVisible = ref(false)
const ticketsDialogVisible = ref(false)
const createDesignDialogRef = ref(null)

const watchFaceName = computed({
  get: () => baseStore.watchFaceName,
  set: (value) => baseStore.setWatchFaceName(value)
})
// 可以在后续需要时暴露设备事件
const handleDeviceSelect = () => {
  // placeholder: 可以在这里加埋点或提示
}

const onDeviceSelected = (device) => {
  // 设备更新逻辑已在 DeviceSelector 中完成（更新接口 + 刷新 userStore）
}
const showDesignerConfirm = () => {
  designerDialogVisible.value = true
}

const showDesignsListConfirm = () => {
  designsListDialogVisible.value = true
}

const showFontsConfirm = () => {
  fontsDialogVisible.value = true
}

const showDevicesConfirm = () => {
  devicesDialogVisible.value = true
}

const showTicketsConfirm = () => {
  ticketsDialogVisible.value = true
}

const confirmNewDesign = () => {
  designerDialogVisible.value = false
  createDesignDialogRef.value?.show()
}

const confirmOpenDesignsList = () => {
  designsListDialogVisible.value = false
  baseStore.$reset()
  router.push('/designs')
}

const confirmOpenFonts = () => {
  fontsDialogVisible.value = false
  baseStore.$reset()
  router.push('/fonts')
}

const confirmOpenDevices = () => {
  devicesDialogVisible.value = false
  baseStore.$reset()
  router.push('/devices')
}

const confirmOpenTickets = () => {
  ticketsDialogVisible.value = false
  baseStore.$reset()
  router.push('/tickets')
}



</script>

<style scoped>
.app-header {
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: rotate(360deg);
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  background: linear-gradient(120deg, #409EFF, #2c3e50);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  color: #666;
  font-size: 14px;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;
}

.nav-link:hover {
  color: #2196F3;
  background-color: rgba(33, 150, 243, 0.08);
}

.nav-link :deep(svg) {
  width: 18px;
  height: 18px;
}

.app-info {
  display: flex;
  gap: 16px;
  max-width: 400px;
}

.app-info :deep(.el-input) {
  width: 180px;
}

.app-info :deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding: 0 8px;
}

.app-info :deep(.el-input__inner) {
  height: 36px;
  font-size: 14px;
  color: #333;
}

.app-info :deep(.el-input__inner::placeholder) {
  color: #999;
}

.actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 8px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  color: #2196F3;
  border-color: #2196F3;
  background: rgba(33, 150, 243, 0.04);
}

.user-menu {
  position: relative;
  height: 60px;
  display: flex;
  align-items: center;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-avatar:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  user-select: none;
  transition: transform 0.2s ease;
}

.user-avatar:hover .avatar-circle {
  transform: scale(1.05);
}

.username {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  padding: 6px;
  z-index: 1000;
  transform-origin: top right;
  animation: dropdown-fade 0.2s ease;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: #333;
  font-size: 14px;
  transition: all 0.2s ease;
  border-radius: 6px;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: rgba(33, 150, 243, 0.08);
  color: #2196F3;
}

.dropdown-item :deep(svg) {
  width: 18px;
  height: 18px;
}

.dropdown-divider {
  height: 1px;
  background-color: #f0f0f0;
  margin: 6px;
}

@keyframes dropdown-fade {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .app-header {
    background: #1a1a1a;
    border-bottom-color: #333;
  }

  .brand-title {
    background: linear-gradient(120deg, #409EFF, #ffffff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .nav-link {
    color: #e0e0e0;
  }

  .nav-link:hover {
    background-color: rgba(33, 150, 243, 0.15);
  }

  .app-info :deep(.el-input__inner) {
    color: #e0e0e0;
    background: transparent;
  }

  .action-btn {
    background: #2a2a2a;
    border-color: #404040;
    color: #e0e0e0;
  }

  .action-btn:hover {
    background: rgba(33, 150, 243, 0.15);
  }

  .username {
    color: #e0e0e0;
  }

  .dropdown-menu {
    background-color: #2a2a2a;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .dropdown-item {
    color: #e0e0e0;
  }

  .dropdown-item:hover {
    background-color: rgba(33, 150, 243, 0.15);
  }

  .dropdown-divider {
    background-color: #404040;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }

  .header-left {
    gap: 20px;
  }

  .header-left h1 {
    font-size: 18px;
  }

  .nav-link {
    padding: 6px 12px;
  }

  .app-info :deep(.el-input) {
    width: 140px;
  }

  .username {
    max-width: 80px;
  }
}
</style> 