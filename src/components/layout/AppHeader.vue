<template>
  <header class="app-header">
    <div class="header-left">
      <div class="brand">
        <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="Wristo Studio" class="logo">
        <h1 class="brand-title">Wristo Studio</h1>
      </div>
      <nav class="header-nav">
        <a @click="showDesignerConfirm" class="nav-link">
          <Icon icon="material-symbols:edit-square" />
          {{ t('nav.newProject') }}
        </a>
        <el-dialog
          v-model="designerDialogVisible"
          :title="t('dialog.confirm')"
          width="30%"
          append-to-body
          :z-index="4000"
        >
          <span>{{ t('dialog.closeAndOpenNewProjects') }}</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="designerDialogVisible = false">{{ t('common.cancel') }}</el-button>
              <el-button type="primary" @click="confirmNewDesign">{{ t('common.confirm') }}</el-button>
            </span>
          </template>
        </el-dialog>
        <a @click="showDesignsListConfirm" class="nav-link">
          <Icon icon="material-symbols:list" />
          {{ t('nav.workspace') }}
        </a>
        <!-- <a @click="showFontsConfirm" class="nav-link">
          <Icon icon="material-symbols:font-download-outline" />
          Font Preview
        </a> -->
        <el-dialog
          v-model="designsListDialogVisible"
          :title="t('dialog.confirm')"
          width="30%"
          append-to-body
          :z-index="4000"
        >
          <span>{{ t('dialog.saveAndOpenWorkspace') }}</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="designsListDialogVisible = false">{{ t('common.cancel') }}</el-button>
              <el-button type="primary" @click="confirmOpenDesignsList">{{ t('common.confirm') }}</el-button>
            </span>
          </template>
        </el-dialog>
        <el-dialog
          v-model="fontsDialogVisible"
          :title="t('dialog.confirm')"
          width="30%"
          append-to-body
          :z-index="4000"
        >
          <span>{{ t('dialog.closeAndOpenFontPreview') }}</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="fontsDialogVisible = false">{{ t('common.cancel') }}</el-button>
              <el-button type="primary" @click="confirmOpenFonts">{{ t('common.confirm') }}</el-button>
            </span>
          </template>
        </el-dialog>
        <el-dialog
          v-model="devicesDialogVisible"
          :title="t('dialog.confirm')"
          width="30%"
          append-to-body
          :z-index="4000"
        >
          <span>{{ t('dialog.closeAndOpenDevices') }}</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="devicesDialogVisible = false">{{ t('common.cancel') }}</el-button>
              <el-button type="primary" @click="confirmOpenDevices">{{ t('common.confirm') }}</el-button>
            </span>
          </template>
        </el-dialog>
        <el-dialog
          v-model="ticketsDialogVisible"
          :title="t('dialog.confirm')"
          width="30%"
          append-to-body
          :z-index="4000"
        >
          <span>{{ t('dialog.closeAndOpenTickets') }}</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="ticketsDialogVisible = false">{{ t('common.cancel') }}</el-button>
              <el-button type="primary" @click="confirmOpenTickets">{{ t('common.confirm') }}</el-button>
            </span>
          </template>
        </el-dialog>
      </nav>
    </div>

    <div class="app-info" v-if="route.path === '/design'">
      <el-input 
        type="text" 
        v-model="watchFaceName" 
        :placeholder="t('header.watchFaceName')"
        :input-style="{ border: 'none', background: 'transparent' }" 
      />
    </div>

    <DeviceDisplay
      @select-device="handleDeviceSelect"
      @device-selected="onDeviceSelected"
    />

    <ThemeSwitcher />
    <LanguageSwitcher />
    <UserMenu />
  </header>
  <CreateDesignDialog ref="createDesignDialogRef" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useExportStore } from '@/stores/exportStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import DeviceDisplay from '@/components/common/DeviceDisplay.vue'
import CreateDesignDialog from '../dialogs/CreateDesignDialog.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import UserMenu from './UserMenu.vue'
import emitter from '@/utils/eventBus'
import { useI18n } from '@/i18n'

const props = defineProps({
  // 其他需要保留的 props
})

const emit = defineEmits(['update:isDialogVisible'])

const router = useRouter()
const route = useRoute()
const baseStore = useBaseStore()
const exportStore = useExportStore()
const historyStore = useHistoryStore()
const messageStore = useMessageStore()
const userStore = useUserStore()
const { t } = useI18n()

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
  // 只有在画布路由（/design?id=xxx）下才弹出确认提示
  const query = route.query || {}
  if (route.name === 'Design' && query.id) {
    designerDialogVisible.value = true
    return
  }

  // 如果当前已经在 New Projects 页面，直接触发全局事件打开弹框，可重复触发
  if (route.name === 'new-projects') {
    emitter.emit('open-new-project-dialog')
    return
  }

  // 其他页面：重置状态并跳转到 New Projects，由 NewProjects 自己在 mounted/activated 时弹框
  baseStore.$reset()
  router.push('/designs/new-projects')
}

const showDesignsListConfirm = () => {
  if (baseStore.inCanvasWorkarea) {
    if (!historyStore.hasUnsavedChanges()) {
      baseStore.$reset()
      router.push('/designs')
      return
    }
    designsListDialogVisible.value = true
  } else {
    baseStore.$reset()
    router.push('/designs')
  }
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
  baseStore.$reset()
  router.push('/designs/new-projects')
}

const confirmOpenDesignsList = async () => {
  try {
    // 先保存当前 Project
    baseStore.deactivateObject && baseStore.deactivateObject()
    const result = await exportStore.uploadApp()
    if (result !== 0) {
      // 保存失败或被取消
      return
    }
    // 保存成功后再关闭弹窗并跳转 Workspace
    designsListDialogVisible.value = false
    baseStore.$reset()
    router.push('/designs')
  } catch (error) {
    console.error('[AppHeader] confirmOpenDesignsList save failed:', error)
    messageStore.error(t('project.failedToSave'))
  }
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
  height: 56px;
  background: var(--studio-surface-raised);
  border-bottom: 1px solid var(--studio-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 20px;
  box-shadow: var(--studio-shadow-sm);
  position: sticky;
  top: 0;
  z-index: 1000;
  flex: 0 0 56px;
  min-width: 0;
  backdrop-filter: saturate(160%) blur(14px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 22px;
  min-width: 0;
  flex: 1 1 auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: max-content;
}

.logo {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  box-shadow: 0 6px 14px rgba(15, 107, 104, 0.14);
  transition: transform 0.2s ease;
}

.logo:hover {
  transform: translateY(-1px);
}

.brand-title {
  font-size: 1.05rem;
  font-weight: 750;
  color: var(--studio-text);
  margin: 0;
  letter-spacing: 0;
}

.header-nav {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 13px;
  color: var(--studio-text-muted);
  font-size: 14px;
  font-weight: 650;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--studio-radius-md);
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--studio-primary);
  background-color: var(--studio-primary-soft);
  border-color: var(--studio-primary-border);
}

.nav-link :deep(svg) {
  width: 18px;
  height: 18px;
}

.app-info {
  display: flex;
  gap: 16px;
  max-width: 260px;
  flex: 0 1 260px;
  min-width: 140px;
}

.app-info :deep(.el-input) {
  width: 100%;
}

.app-info :deep(.el-input__wrapper) {
  background: var(--studio-surface-soft);
  border-radius: var(--studio-radius-md);
  box-shadow: 0 0 0 1px var(--studio-border) inset !important;
  padding: 0 12px;
}

.app-info :deep(.el-input__inner) {
  height: 36px;
  font-size: 14px;
  color: var(--studio-text);
  font-weight: 650;
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
  color: #0f6b68;
  border-color: #0f6b68;
  background: rgba(15, 107, 104, 0.04);
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
  background-color: rgba(15, 107, 104, 0.08);
  color: #0f6b68;
}

.dropdown-item :deep(svg) {
  width: 18px;
  height: 18px;
}

@media (max-width: 720px) {
  .app-header {
    gap: 8px;
    padding: 0 12px;
    overflow: hidden;
    height: 56px;
  }

  .header-left {
    gap: 10px;
    flex: 1 1 auto;
    overflow: hidden;
  }

  .brand {
    gap: 0;
    flex: 0 0 auto;
  }

  .brand-title {
    display: none;
  }

  .header-nav {
    gap: 4px;
    overflow: hidden;
  }

  .nav-link {
    width: 44px;
    height: 44px;
    justify-content: center;
    padding: 0;
    flex: 0 0 44px;
  }

  .nav-link :deep(svg) {
    width: 20px;
    height: 20px;
  }

  .nav-link {
    font-size: 0;
  }

  :deep(.device-display-container) {
    flex: 0 0 auto;
  }

  :deep(.device-info) {
    width: 44px;
    height: 44px;
    justify-content: center;
    padding: 0;
    border-radius: 8px;
  }

  :deep(.device-name) {
    display: none;
  }

  .app-info {
    display: none;
  }
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

:global(html[data-studio-theme='dark']) .action-btn {
  background: var(--studio-surface-soft);
  border-color: var(--studio-border);
  color: var(--studio-text);
}

:global(html[data-studio-theme='dark']) .action-btn:hover {
  background: var(--studio-primary-soft);
}

:global(html[data-studio-theme='dark']) .user-avatar:hover {
  background-color: var(--studio-surface-soft);
}

:global(html[data-studio-theme='dark']) .username {
  color: var(--studio-text);
}

:global(html[data-studio-theme='dark']) .dropdown-menu {
  background-color: var(--studio-surface);
  box-shadow: var(--studio-shadow-md);
}

:global(html[data-studio-theme='dark']) .dropdown-item {
  color: var(--studio-text);
}

:global(html[data-studio-theme='dark']) .dropdown-item:hover {
  background-color: var(--studio-primary-soft);
  color: var(--studio-primary);
}

:global(html[data-studio-theme='dark']) .dropdown-divider {
  background-color: var(--studio-border);
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .app-header {
    background: var(--studio-surface-raised);
    border-bottom-color: var(--studio-border);
  }

  .brand-title {
    color: var(--studio-text);
  }

  .nav-link {
    color: var(--studio-text-muted);
  }

  .nav-link:hover {
    background-color: var(--studio-primary-soft);
  }

  .app-info :deep(.el-input__inner) {
    color: var(--studio-text);
    background: transparent;
  }

  .action-btn {
    background: var(--studio-surface-soft);
    border-color: var(--studio-border);
    color: var(--studio-text);
  }

  .action-btn:hover {
    background: var(--studio-primary-soft);
  }

  .username {
    color: var(--studio-text);
  }

  .dropdown-menu {
    background-color: var(--studio-surface);
    box-shadow: var(--studio-shadow-md);
  }

  .dropdown-item {
    color: var(--studio-text);
  }

  .dropdown-item:hover {
    background-color: var(--studio-primary-soft);
  }

  .dropdown-divider {
    background-color: var(--studio-border);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 12px;
  }

  .header-left {
    gap: 10px;
  }

  .header-left h1 {
    font-size: 18px;
  }

  .nav-link {
    padding: 0 10px;
  }

  .app-info :deep(.el-input) {
    width: 140px;
  }

  .username {
    max-width: 80px;
  }
}

@media (max-width: 720px) {
  .nav-link {
    padding: 0;
  }
}
</style>
