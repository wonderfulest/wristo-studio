<template>
  <header class="studio-header" aria-label="Studio toolbar">
    <div class="studio-leading">
      <button type="button" class="brand" :title="t('nav.workspace')" @click="showDesignsListConfirm">
        <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="" />
        <span>WRISTO <strong>STUDIO</strong></span>
      </button>
      <AppMenu :disabled="!editorReady || busy">
        <template #file-actions>
          <el-menu-item index="file/new" :disabled="busy || !editorReady" @click="showDesignerConfirm">{{ t('nav.newProject') }}</el-menu-item>
          <el-menu-item index="file/workspace" @click="showDesignsListConfirm">{{ t('nav.workspace') }}</el-menu-item>
          <el-menu-item index="file/save" :disabled="busy || !editorReady" @click="saveDesign">{{ t('common.save') }} <span class="shortcut">⌘ S</span></el-menu-item>
          <el-divider />
        </template>
        <template #help-actions>
          <el-menu-item index="help/installer" @click="openPrgInstallerGuide">{{ t('nav.prgInstaller') }}</el-menu-item>
        </template>
      </AppMenu>
    </div>
    <div class="studio-document">
      <div class="history-actions" :aria-label="`${t('canvas.undo')} / ${t('canvas.redo')}`">
        <button type="button" :disabled="!editorReady || !historyStore.canUndo()" :title="t('canvas.undo')" :aria-label="t('canvas.undo')" @click="historyStore.undo()"><Icon icon="material-symbols:undo-rounded" /></button>
        <button type="button" :disabled="!editorReady || !historyStore.canRedo()" :title="t('canvas.redo')" :aria-label="t('canvas.redo')" @click="historyStore.redo()"><Icon icon="material-symbols:redo-rounded" /></button>
      </div>
      <label class="document-name">
        <input v-model="watchFaceName" :disabled="!editorReady" :aria-label="t('header.watchFaceName')" :placeholder="t('header.watchFaceName')" maxlength="50" />
        <Icon icon="material-symbols:edit-outline" />
      </label>
    </div>
    <div class="studio-tools">
      <DeviceDisplay ref="deviceDisplay" />
      <button type="button" class="save-button" :disabled="busy || !editorReady" @click="saveDesign">{{ t('common.save') }}</button>
      <button type="button" class="build-button" :disabled="busy || !editorReady" @click="buildDesign">
        <Icon icon="material-symbols:build-outline" /> {{ t('studioMenu.build') }}
      </button>
      <div class="preferences"><ThemeSwitcher /><LanguageSwitcher /></div>
      <UserMenu />
    </div>
  </header>
  <el-dialog v-model="designerDialogVisible" :title="t('dialog.confirm')" width="min(440px, 92vw)" append-to-body>
    <p>{{ t('studioMenu.newConfirm') }}</p>
    <template #footer>
      <el-button @click="designerDialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmNewDesign">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="designsListDialogVisible" :title="t('dialog.confirm')" width="min(480px, 92vw)" append-to-body>
    <p>{{ t('dialog.saveAndOpenWorkspace') }}</p>
    <template #footer>
      <div class="workspace-confirm-footer">
        <el-button type="danger" :disabled="busy" @click="discardAndOpenDesignsList">{{ t('dialog.discardAndExit') }}</el-button>
        <span>
          <el-button :disabled="busy" @click="designsListDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="busy" @click="confirmOpenDesignsList">{{ t('common.confirm') }}</el-button>
        </span>
      </div>
    </template>
  </el-dialog>
  <SubmitDesignDialog ref="submitDesignDialog" @success="openBuilds" />
</template>

<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter, useRoute } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useExportStore } from '@/stores/exportStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { showErrorOnce } from '@/utils/errorMessage'
import { useI18n } from '@/i18n'
import AppMenu from './AppMenu.vue'
import DeviceDisplay from '@/components/common/DeviceDisplay.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import UserMenu from './UserMenu.vue'

const SubmitDesignDialog = defineAsyncComponent(() => import('@/components/dialogs/SubmitDesignDialog.vue'))
const router = useRouter()
const route = useRoute()
const baseStore = useBaseStore()
const exportStore = useExportStore()
const historyStore = useHistoryStore()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const { t } = useI18n()
const designerDialogVisible = ref(false)
const designsListDialogVisible = ref(false)
const busy = ref(false)
const deviceDisplay = ref(null)
const submitDesignDialog = ref(null)
const editorReady = computed(() => Boolean(baseStore.id && baseStore.canvas && !baseStore.designLoading
  && baseStore.id === (route.query.id || route.query.designId || route.query.from)))
const watchFaceName = computed({
  get: () => baseStore.watchFaceName,
  set: (value) => baseStore.setWatchFaceName(value),
})
const showDesignerConfirm = () => {
  if (historyStore.hasUnsavedChanges()) designerDialogVisible.value = true
  else confirmNewDesign()
}
const confirmNewDesign = () => {
  designerDialogVisible.value = false
  // The editor flushes the current draft before loading the new project.
  router.push('/design')
}
const showDesignsListConfirm = () => {
  if (busy.value) return
  if (baseStore.inCanvasWorkarea && historyStore.hasUnsavedChanges()) designsListDialogVisible.value = true
  else router.push('/designs')
}
const discardAndOpenDesignsList = () => {
  designsListDialogVisible.value = false
  baseStore.$reset()
  router.push('/designs')
}
const confirmOpenDesignsList = async () => {
  if (await saveDesign()) {
    designsListDialogVisible.value = false
    router.push('/designs')
  }
}
const saveDesign = async () => {
  if (busy.value || !editorReady.value) return false
  busy.value = true
  try {
    baseStore.deactivateObject()
    return await exportStore.uploadApp() === 0
  } catch (error) {
    showErrorOnce(error, t('project.failedToSave'))
    return false
  } finally {
    busy.value = false
  }
}
const buildDesign = async () => {
  if (busy.value || !editorReady.value || !membershipGate.requireExport()) return
  const deviceId = userStore.editorDevice?.deviceId
  if (!deviceId) {
    deviceDisplay.value?.openSelector()
    return
  }
  if (!await saveDesign()) return
  await submitDesignDialog.value?.show({ designUid: baseStore.id }, { mode: 'prg-build', deviceId })
}
const openBuilds = () => router.push('/designs')
const openPrgInstallerGuide = () => {
  window.open(router.resolve({ name: 'PrgInstallerGuide' }).href, '_blank', 'noopener')
}
</script>

<style scoped>
.studio-header { box-sizing: border-box; height: var(--studio-header-height, 56px); flex: 0 0 var(--studio-header-height, 56px); display: flex; align-items: center; gap: 20px; padding: 0 14px; background: var(--studio-surface-raised); color: var(--studio-text); border-bottom: 1px solid var(--studio-border); position: relative; z-index: var(--studio-z-app-header); }
.studio-leading, .studio-document, .studio-tools, .history-actions, .preferences { display: flex; align-items: center; }
.studio-leading { gap: 18px; flex-shrink: 0; }
.brand { display: flex; align-items: center; gap: 7px; padding: 0; border: 0; color: inherit; background: transparent; cursor: pointer; white-space: nowrap; font-size: 12px; letter-spacing: -0.3px; font-weight: 800; }
.brand img { width: 27px; height: 27px; }
.brand strong { color: var(--studio-primary); }
.studio-document { flex: 1 1 auto; justify-content: center; gap: 8px; min-width: 100px; }
.history-actions { gap: 4px; }
.history-actions button { width: 30px; height: 30px; display: grid; place-items: center; padding: 0; border: 1px solid var(--studio-border); background: transparent; color: var(--studio-text-muted); border-radius: 5px; cursor: pointer; }
.history-actions svg { width: 17px; height: 17px; }
.document-name { display: flex; align-items: center; justify-content: center; gap: 6px; flex: 0 1 320px; min-width: 70px; height: 34px; padding: 0 10px; border: 1px solid var(--studio-border); background: var(--studio-surface-soft); border-radius: 5px; }
.document-name input { width: 100%; min-width: 0; padding: 0; border: 0; outline: none; text-align: center; font: inherit; font-size: 12px; font-weight: 600; color: var(--studio-text); background: transparent; }
.document-name:focus-within { border-color: var(--studio-primary); }
.document-name svg { width: 13px; height: 13px; color: var(--studio-text-subtle); flex-shrink: 0; }
.studio-tools { gap: 8px; flex-shrink: 0; }
.save-button, .build-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 5px; padding: 0 12px; height: 34px; font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; white-space: nowrap; }
.save-button { color: var(--studio-text); background: transparent; border: 1px solid var(--studio-border); }
.build-button { background: var(--studio-primary); border: 1px solid var(--studio-primary); color: #fff; }
.build-button svg { width: 15px; height: 15px; }
.build-button:hover:not(:disabled) { background: var(--studio-primary-hover); }
button:disabled { opacity: 0.4; cursor: not-allowed; }
button:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 2px; }
.preferences { gap: 2px; }
.studio-tools :deep(.theme-button), .studio-tools :deep(.language-button) { width: 30px; min-height: 32px; height: 32px; padding: 0; justify-content: center; }
.studio-tools :deep(.theme-button span), .studio-tools :deep(.language-button span), .studio-tools :deep(.language-button .el-icon), .studio-tools :deep(.user-trigger-copy), .studio-tools :deep(.user-trigger-arrow), .studio-tools :deep(.ticket-reminder) { display: none; }
.studio-tools :deep(.user-avatar-container) { padding: 0 2px; border: 0; background: transparent; }
.studio-tools :deep(.user-avatar) { width: 28px; height: 28px; }
.studio-tools :deep(.device-info) { min-height: 34px; height: 34px; padding: 3px 8px; border-radius: 5px; }
.studio-tools :deep(.device-avatar) { width: 20px; height: 20px; flex-basis: 20px; }
.studio-tools :deep(.device-name) { font-size: 12px; max-width: 130px; }
.shortcut { margin-left: auto; padding-left: 30px; color: var(--studio-text-subtle); font-size: 12px; }
.workspace-confirm-footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
@media (max-width: 1250px) { .studio-header { gap: 12px; padding: 0 10px; } .studio-leading { gap: 8px; } .brand span { display: none; } .studio-tools :deep(.device-name) { max-width: 100px; } }
@media (max-width: 1000px) { .studio-header { gap: 8px; } .history-actions, .preferences { display: none; } .studio-tools { gap: 5px; } .studio-tools :deep(.device-name) { display: none; } }
@media (max-width: 720px) { .studio-header { overflow-x: auto; } .studio-document { min-width: 110px; } .save-button { display: none; } }
</style>
