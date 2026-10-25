<template>
  <section class="design-management" :aria-label="t('faceDetail.applicationActions')">
    <p v-if="loadError" role="alert">{{ loadError }} <button @click="fetchDesigns">{{ t('faceDetail.tryAgain') }}</button></p>
    <template v-if="design">
      <div class="management-heading"><span>{{ t('faceDetail.designWorkspace') }}</span><DeviceDisplay ref="deviceDisplayRef" /></div>
        <DesignCard
          :design="design"
          :management="true" :information-target="informationTarget.querySelector<HTMLElement>('.management-summary') || informationTarget"
          :is-merchant-user="isMerchantUser"
          :is-admin-user="isAdminUser"
          :can-delete-design="canDeleteDesign"
          :show-creator="true"
          :loading-states="loadingStatesPlain"
          :current-user-id="userStore.userInfo?.id ?? null"
          :status-text="getStatusText(design.designStatus)"
          :status-color="getStatusColor(design.designStatus)"
          :last-go-live-text="formatDateNullable(design.product?.lastGoLive ?? null)"
          :creator-name="getCreatorName(design)"
          :design-image-url="getDesignImageUrl(design)"
          :has-new-release="hasNewRelease(design)"
          :has-downloadable-package="hasDownloadablePackage(design)"
          :show-package-download="true"
          :show-prg-preview="true"
          :store-weight-saving="storeWeightSavingAppIds.has(design.product?.appId ?? -1)"
          :rename-saving="renameSavingDesignIds.has(design.id)"
          :allow-rename="true"
          :now-ms="nowMs"
          @delete="confirmDelete"
          @open="openCanvas"
          @build-prg="buildPrg"
          @cancel-prg="cancelPrg"
          @cancel-iq="cancelIq"
          @prepare-preview-prg="preparePreviewPrg"
          @preview-prg="previewPrg"
          @run-prg="runPrg"
          @submit="submitDesign"
          @download-package="downloadPackage"
          @copy="copyDesign"
          @update-store-weight="updateStoreWeight"
          @rename="renameDesign"
          @transfer-owner="openTransferOwnerDialog"
        />
    </template>
    <p v-else-if="!loadError" role="status">{{ t('faceDetail.loadingApplicationActions') }}</p>
    <el-dialog
      v-model="duplicateLanguageDialogVisible"
      :title="t('project.duplicateLanguageTitle')"
      width="400px"
      append-to-body
    >
      <p class="duplicate-language-hint">{{ t('project.duplicateLanguageHint') }}</p>
      <el-radio-group v-model="duplicateLanguage">
        <el-radio-button value="eng">English</el-radio-button>
        <el-radio-button value="zhs">中文</el-radio-button>
      </el-radio-group>
      <template #footer>
        <el-button @click="duplicateLanguageDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="confirmDuplicateLanguage">{{ t('card.duplicate') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="transferDialogVisible"
      :title="t('card.transferOwner.title')"
      width="480px"
      append-to-body
      @closed="resetTransferOwnerDialog"
    >
      <div v-if="transferDesign" class="transfer-owner-summary">
        <p>
          {{ t('card.transferOwner.currentApp') }}:
          <strong>{{ transferDesign.name }}</strong>
          ({{ t('card.appId') }}: {{ transferDesign.product?.appId }})
        </p>
        <p>
          {{ t('card.transferOwner.currentAuthor') }}:
          {{ getCreatorName(transferDesign) }}
        </p>
      </div>
      <DesignerSelect
        v-model="transferTargetUserId"
        :placeholder="t('card.transferOwner.placeholder')"
      />
      <template #footer>
        <el-button :disabled="transferLoading" @click="transferDialogVisible = false">
          {{ t('common.cancel') }}
        </el-button>
        <el-button type="primary" :loading="transferLoading" @click="confirmTransferOwner">
          {{ t('card.transferOwner.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="deleteDialogVisible" :title="t('project.confirmDelete')" width="30%" append-to-body>
      <span>{{ t('project.deleteBody') }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button 
            type="danger" 
            @click="confirmDeleteDesign"
            :loading="!!designToDelete && loadingStates.delete.has(designToDelete.id)"
          >
            {{ t('project.confirmDeleteButton') }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 设计详情对话框 -->
    
    <!-- 提交设计对话框 -->
    <SubmitDesignDialog ref="submitDesignDialog" @success="handleSubmitSuccess" />
    
    <!-- Publish 对话框 -->
    <Teleport :to="informationTarget.querySelector('.management-publishing') || informationTarget">
      <PublishForm v-if="design?.product?.appId" ref="publishForm" :active-section="activeSection === 'overview' ? 'listing' : activeSection" @section-change="emit('select-section', $event)" @success="handleGoLiveSuccess" />
    </Teleport>


  </section>
</template>
<script setup lang="ts">
import { observeOnboardingDesign, downloadedOnboardingPrg } from '@/features/onboarding/progress'
import type { PublishSection } from '@/components/dialogs/publishSections'
import { designUnlocksApi } from '@/api/wristo/designUnlocks'
import { showErrorOnce } from '@/utils/errorMessage'

import { ref, computed, h, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
// 移除旧的API导入，使用新的designApi
import { designApi } from '@/api/wristo/design'
import { productsApi } from '@/api/wristo/products'
import { useMessageStore } from '@/stores/message'
import { useBaseStore } from '@/stores/baseStore'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import { ApiResponse } from '@/types/api/api'
import { CreateCopyDesignParams } from '@/types/api/design'
import DeviceDisplay from '@/components/common/DeviceDisplay.vue'
import DesignerSelect from '@/components/users/DesignerSelect.vue'
import SubmitDesignDialog from '@/components/dialogs/SubmitDesignDialog.vue'
import PublishForm from '@/components/dialogs/PublishForm.vue'
import { Design, type DesignListItem, DesignStatus } from '@/types/api/design'
import DesignCard from '@/views/designs/DesignCard.vue'
import { useI18n } from '@/i18n'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { downloadPackageFile } from '@/utils/packageDownload'
import {
  buildPrgInstallerDeepLink,
  createPrgInstallerTicketCache,
} from '@/api/wristo/prg-installer'
import { isStaleDynamicImportError } from '@/router/chunkLoadRecovery'
import {
  canChooseDuplicateLanguage,
  getDuplicateSourceLanguage,
  withDuplicateLanguage,
} from '@/views/designs/designDuplicateLanguage'
import type { AppLanguage } from '@/types/localization'
import { createPrgInstallerPromptState } from '@/features/prg-installer/promptState'
import { ElButton, ElMessageBox, ElNotification } from 'element-plus'
const submitDesignDialog = ref<any>(null)
type PublishFormRef = { show: (design: Design) => void }
const publishForm = ref<PublishFormRef | null>(null)
const router = useRouter()
const messageStore = useMessageStore()
const baseStore = useBaseStore()
const userStore = useUserStore()
const currentDeviceId = computed(() => userStore.userInfo?.device?.deviceId || '')
const { t } = useI18n()
const membershipGate = useStudioMembershipGate()
let prgInstallerPromptStorage: Pick<Storage, 'getItem' | 'setItem'> | undefined
try {
  prgInstallerPromptStorage = window.localStorage
} catch {
  prgInstallerPromptStorage = undefined
}
const prgInstallerPromptState = createPrgInstallerPromptState(prgInstallerPromptStorage)
const nowMs = ref(Date.now())
let prgClockTimer: ReturnType<typeof setInterval> | undefined

interface LoadingStates {
  submit: Set<number>
  copy: Set<number>
  delete: Set<number>
  favorite: Set<number>
  prgBuild: Set<number>
  previewPrg: Set<number>
}

const deviceDisplayRef = ref<InstanceType<typeof DeviceDisplay> | null>(null)
const deleteDialogVisible = ref(false)
const designToDelete = ref<DesignListItem | null>(null)
const storeWeightSavingAppIds = ref(new Set<number>())
const renameSavingDesignIds = ref(new Set<number>())
const transferDialogVisible = ref(false)
const transferDesign = ref<DesignListItem | null>(null)
const transferTargetUserId = ref<number | undefined>()
const transferLoading = ref(false)
const duplicateLanguageDialogVisible = ref(false)
const duplicateSourceDesign = ref<Design | null>(null)
const duplicateLanguage = ref<AppLanguage>('eng')

// 添加加载状态
const loadingStates = ref<LoadingStates>({
  submit: new Set<number>(),
  copy: new Set<number>(),
  delete: new Set<number>(),
  favorite: new Set<number>(),
  prgBuild: new Set<number>(),
  previewPrg: new Set<number>()
})

// plain loading states object for child components
const loadingStatesPlain = computed(() => loadingStates.value)

const isMerchantUser = computed(() => {
  const roles = userStore.userInfo?.roles || []
  return roles.some((role) => role.roleCode === 'ROLE_MERCHANT')
})

const isAdminUser = computed(() => userStore.isAdminUser)

const canDeleteDesign = computed(() => {
  if (userStore.hasFullStudioAccess) return true
  const level = userStore.studioMembership?.level || 'free'
  return level !== 'free'
})

const isLaunchedDesign = (design: DesignListItem | null | undefined) => !!design?.product?.lastGoLive

// 获取状态文本
const getStatusText = (status: DesignStatus) => {
  const statusMap = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    rejected: t('status.rejected')
  }
  return statusMap[status as keyof typeof statusMap] || t('status.unknown')
}

// 获取状态颜色
const getStatusColor = (status: DesignStatus) => {
  const statusMap = {
    draft: '#606266',        // 暗色 - 草稿状态
    submitted: '#909399',    // 灰色 - 待审核状态
    approved: '#67C23A',     // 亮色 - 已批准状态
    rejected: '#F56C6C'      // 红色 - 被拒绝状态
  }
  return statusMap[status as keyof typeof statusMap] || '#909399'
}

// 格式化可空日期（用于 Last Publish）
const formatDateNullable = (date: string | number | null | undefined) => {
  if (!date) return t('common.never')
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 获取创作者名称
const getCreatorName = (design: DesignListItem) => {
  return design.user?.username || t('common.unknownUser')
}

// 获取设计图片URL
const getDesignImageUrl = (design: DesignListItem) => {
  return design.cover?.url || ''
}

const getCurrentDeviceParams = () => {
  const deviceId = (userStore.userInfo as any)?.device?.deviceId
  return deviceId ? { device: deviceId } : undefined
}

const openCanvas = async (design: DesignListItem) => {
  try {
    const response = await designApi.getDesignByUid(design.designUid, getCurrentDeviceParams()) as ApiResponse<Design>
    const designData = response.data || {} as Design

    baseStore.watchFaceName = designData.name
    baseStore.appId = designData.product?.appId || -1

    await router.push('/design?id=' + designData.designUid)
  } catch (error) {
    if (isStaleDynamicImportError(error)) return
    console.error('加载设计失败:', error)
    showErrorOnce(error, t('project.loadDesignFailed'))
  }
}

const resetTransferOwnerDialog = () => {
  if (transferLoading.value) return
  transferDesign.value = null
  transferTargetUserId.value = undefined
}

const openTransferOwnerDialog = (design: DesignListItem) => {
  const appId = design.product?.appId
  if (!isAdminUser.value || !appId) {
    messageStore.error(t('card.transferOwner.unavailable'))
    return
  }

  transferDesign.value = design
  transferTargetUserId.value = undefined
  transferDialogVisible.value = true
}

const confirmTransferOwner = async () => {
  const design = transferDesign.value
  const appId = design?.product?.appId
  if (!isAdminUser.value || !appId) {
    messageStore.error(t('card.transferOwner.unavailable'))
    return
  }
  if (!transferTargetUserId.value) {
    messageStore.warning(t('card.transferOwner.targetRequired'))
    return
  }
  if (transferTargetUserId.value === design.user?.id) {
    messageStore.warning(t('card.transferOwner.sameDesigner'))
    return
  }

  transferLoading.value = true
  try {
    const response = await productsApi.transferOwner(appId, transferTargetUserId.value)
    if (response.code !== 0) {
      messageStore.error(response.msg || t('card.transferOwner.failed'))
      return
    }

    messageStore.success(t('card.transferOwner.success'))
    transferDialogVisible.value = false
    transferDesign.value = null
    transferTargetUserId.value = undefined
    await fetchDesigns()
    emit('updated')
  } catch (error: any) {
    console.error('[MyDesigns] transfer product owner failed:', error)
    showErrorOnce(error, error?.msg || error?.response?.data?.msg || t('card.transferOwner.failed'))
  } finally {
    transferLoading.value = false
  }
}

const updateStoreWeight = async (design: DesignListItem, storeWeight: number) => {
  const appId = design.product?.appId
  if (!isAdminUser.value || !appId || storeWeightSavingAppIds.value.has(appId)) return

  storeWeightSavingAppIds.value.add(appId)
  try {
    const response = await productsApi.updateStoreWeight(appId, storeWeight)
    if (response.code === 0 && response.data) {
      if (design.product) design.product.storeWeight = response.data.storeWeight ?? storeWeight
      messageStore.success(t('common.savedSuccessfully'))
    } else {
      messageStore.error(response.msg || t('common.saveFailed'))
    }
  } catch (error: any) {
    console.error('[MyDesigns] update Store weight failed:', error)
    showErrorOnce(error, error?.response?.data?.msg || t('common.saveFailed'))
  } finally {
    storeWeightSavingAppIds.value.delete(appId)
  }
}

const renameDesign = async (design: DesignListItem, name: string) => {
  if (renameSavingDesignIds.value.has(design.id)) return

  renameSavingDesignIds.value.add(design.id)
  try {
    const response = await designApi.updateDesign({ uid: design.designUid, name })
    if (response.code === 0) {
      design.name = response.data?.name || name
      emit('updated')
      messageStore.success(t('common.savedSuccessfully'))
    } else {
      messageStore.error(response.msg || t('common.saveFailed'))
    }
  } catch (error: any) {
    console.error('[MyDesigns] rename design failed:', error)
    showErrorOnce(error, error?.response?.data?.msg || t('common.saveFailed'))
  } finally {
    renameSavingDesignIds.value.delete(design.id)
  }
}

const executeDuplicateDesign = async (design: Design, targetLanguage: AppLanguage) => {
  if (loadingStates.value.copy.has(design.id)) return

  try {
    loadingStates.value.copy.add(design.id)
    const newDesignData = { uid: design.designUid } as CreateCopyDesignParams
    const createResponse = await designApi.createDesignByCopy(newDesignData) as ApiResponse<Design>

    if (createResponse.code === 0 && createResponse.data) {
      const sourceLanguage = getDuplicateSourceLanguage(design.configJson)
      if (targetLanguage !== sourceLanguage) {
        const updateResponse = await designApi.updateDesign({
          uid: createResponse.data.designUid,
          configJson: withDuplicateLanguage(createResponse.data.configJson ?? design.configJson, targetLanguage),
        })
        if (!updateResponse || updateResponse.code !== 0) {
          messageStore.error(updateResponse?.msg || t('project.copyLanguageFailed'))
          return
        }
      }

      messageStore.success(t('project.copySuccessful'))
      await userStore.refreshUserInfo()
      const copy = createResponse.data
      await router.push(copy.product?.appId ? `/faces/${copy.product.appId}` : `/designs/${encodeURIComponent(copy.designUid)}`)
    } else {
      messageStore.error(createResponse.msg || t('project.copyFailed'))
    }
  } catch (error) {
    console.error('复制失败:', error)
    showErrorOnce(error, (error as any)?.response?.data?.msg || t('project.copyFailed'))
  } finally {
    loadingStates.value.copy.delete(design.id)
  }
}

// Studio 卡片的 Duplicate：英文应用可选择保留英文或创建中文版。
const copyDesign = async (design: DesignListItem) => {
  if (loadingStates.value.copy.has(design.id)) return
  if (!userStore.canCreateDesign) {
    if (userStore.isStudioConsumer) window.dispatchEvent(new Event('studio-design-limit-reached'))
    const max = userStore.studioMembership?.maxDesigns
    messageStore.warning(max == null ? t('membership.freeCreateLimitReached') : t('membership.createLimitReached', { max }))
    router.push(userStore.isStudioConsumer ? '/designs' : '/design-slots')
    return
  }

  loadingStates.value.copy.add(design.id)
  try {
    const detailResponse = await designApi.getDesignByUid(design.designUid)
    if (!detailResponse || detailResponse.code !== 0 || !detailResponse.data) {
      messageStore.error(detailResponse?.msg || t('project.loadDesignFailed'))
      return
    }

    if (canChooseDuplicateLanguage(detailResponse.data.configJson)) {
      duplicateSourceDesign.value = detailResponse.data
      duplicateLanguage.value = 'eng'
      duplicateLanguageDialogVisible.value = true
      return
    }

    loadingStates.value.copy.delete(design.id)
    await executeDuplicateDesign(detailResponse.data, getDuplicateSourceLanguage(detailResponse.data.configJson))
  } catch (error) {
    console.error('加载待复制应用失败:', error)
    showErrorOnce(error, (error as any)?.response?.data?.msg || t('project.loadDesignFailed'))
  } finally {
    loadingStates.value.copy.delete(design.id)
  }
}

const confirmDuplicateLanguage = async () => {
  const source = duplicateSourceDesign.value
  if (!source) return
  duplicateLanguageDialogVisible.value = false
  duplicateSourceDesign.value = null
  await executeDuplicateDesign(source, duplicateLanguage.value)
}

// 确认删除
const confirmDelete = (design: DesignListItem) => {
  if (isLaunchedDesign(design)) {
    messageStore.warning(t('project.deletePublishedNotAllowed'))
    return
  }
  designToDelete.value = design
  deleteDialogVisible.value = true
}

// 执行删除
const confirmDeleteDesign = async () => {
  if (!designToDelete.value || loadingStates.value.delete.has(designToDelete.value.id)) return
  if (isLaunchedDesign(designToDelete.value)) {
    messageStore.warning(t('project.deletePublishedNotAllowed'))
    deleteDialogVisible.value = false
    designToDelete.value = null
    return
  }

  try {
    loadingStates.value.delete.add(designToDelete.value.id)
    const response = await designApi.deleteDesign(designToDelete.value.designUid)
    if (response.code === 0) {
      messageStore.success(t('project.deleteSuccessful'))
      deleteDialogVisible.value = false
      await userStore.refreshUserInfo()
      await router.push('/designs')
    } else {
      messageStore.error(response.msg || t('project.deleteFailed'))
    }
  } catch (error) {
    console.error('删除失败:', error)
    showErrorOnce(error, t('project.deleteFailed'))
  } finally {
    loadingStates.value.delete.delete(designToDelete.value.id)
  }
}

// 提交设计
const submitDesign = async (design: DesignListItem) => {
  if (design.canInstall !== true && !membershipGate.requireExport()) return
  if (submitDesignDialog.value && typeof submitDesignDialog.value.show === 'function') {
    submitDesignDialog.value.show(design)
  }
}

// 提交 PRG 打包任务
const buildPrg = async (design: DesignListItem) => {
  if (userStore.isStudioConsumer && design.canInstall !== true) {
    await router.push(`/design-unlocks/${encodeURIComponent(design.designUid)}`)
    return
  }
  if (design.canInstall !== true && !userStore.isStudioConsumer && !membershipGate.requireExport()) return
  if (loadingStates.value.prgBuild.has(design.id)) return

  // 获取当前设备 ID：优先使用用户资料中的设备，其次尝试本地已选设备
  let deviceId: string | undefined
  deviceId = (userStore.userInfo as any)?.device?.deviceId

  if (!deviceId) {
    messageStore.warning(t('project.selectDeviceFirst'))
    // 联动打开设备选择器
    deviceDisplayRef.value?.openSelector?.()
    return
  }

  if (submitDesignDialog.value && typeof submitDesignDialog.value.show === 'function') {
    submitDesignDialog.value.show(design, { mode: 'prg-build', deviceId: String(deviceId) })
  }
}

const cancelPrg = (design: DesignListItem) => cancelBuild(design, 'prg')
const cancelIq = (design: DesignListItem) => cancelBuild(design, 'iq')
const cancelBuild = async (design: DesignListItem, type: 'prg' | 'iq') => {
  const deviceId = userStore.userInfo?.device?.deviceId
  const task = type === 'iq' ? design.product?.packagingLog : design.product?.prgPackagingLog
  const label = type === 'iq' ? 'Iq' : 'Prg'
  if (!task?.id || (type === 'prg' && !deviceId)) return
  try {
    await ElMessageBox.confirm(t(`project.cancel${label}BuildConfirm`), t(`card.cancel${label}Build`), {
      confirmButtonText: t(`card.cancel${label}Build`),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
    })
    const response = type === 'iq'
      ? await designApi.cancelIqPackageTask(design.designUid, task.id)
      : await designApi.cancelPrgPackageTask(design.designUid, deviceId!, task.id)
    if (response.code !== 0) throw new Error(response.msg || t(`project.cancel${label}BuildFailed`))
    messageStore.success(t(`project.cancel${label}BuildSubmitted`))
    if (response.data?.status === 'cancel_requested') task.packagingStatus = 'cancel_requested'
    await refreshPackagingStatus()
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    showErrorOnce(error, error?.message || t(`project.cancel${label}BuildFailed`))
  }
}

// 下载安装包
const downloadPackage = async (design: DesignListItem) => {
  if (design.canInstall !== true && !membershipGate.requireExport()) return
  const url = design.product?.release?.packageUrl
  if (url) {
    await downloadPackageFile(url, design.product?.name || design.name, 'iq')
  } else {
    messageStore.error(t('project.downloadUnavailable'))
  }
}

// 运行 PRG：跳转下载 prgUrl
const runPrg = async (design: DesignListItem) => {
  if (userStore.isStudioConsumer) {
    try {
      const response = await designUnlocksApi.status(design.designUid)
      if (!response.data?.canInstall) { await router.push(`/design-unlocks/${encodeURIComponent(design.designUid)}`); return }
    } catch (error) { showErrorOnce(error, 'Unable to check design access'); return }
  } else if (design.canInstall !== true && !membershipGate.requireExport()) return
  const url = (design.product as any)?.prgRelease?.prgUrl
  if (url) {
    await downloadPackageFile(url, design.product?.name || design.name, 'prg')
    downloadedOnboardingPrg(design.designUid, design.product!.prgRelease!.id)
  } else {
    messageStore.error(t('project.prgUnavailable'))
  }
}

const prgInstallerTicketCache = createPrgInstallerTicketCache()

const showPrgInstallerGuideNotification = (message: string) => {
  ElNotification({
    title: t('prgInstallerGuide.title'),
    message: h('div', { class: 'prg-installer-guide-notification' }, [
      h('p', message),
      h(ElButton, {
        link: true,
        type: 'primary',
        onClick: () => { void router.push({ name: 'PrgInstallerGuide' }) },
      }, () => t('project.prgInstallerGuideAction')),
    ]),
    duration: 8000,
  })
}

const preparePreviewPrg = async (design: DesignListItem) => {
  const releaseId = design.product?.prgRelease?.id
  if (!releaseId || loadingStates.value.previewPrg.has(design.id)) return

  loadingStates.value.previewPrg.add(design.id)
  try {
    await prgInstallerTicketCache.prepare(releaseId)
  } catch (error) {
    console.error('Failed to prepare simulator preview:', error)
    showErrorOnce(error, t('project.prgInstallerPreviewFailed'))
  } finally {
    loadingStates.value.previewPrg.delete(design.id)
  }
}

const previewPrg = (design: DesignListItem) => {
  if (loadingStates.value.previewPrg.has(design.id)) return

  const releaseId = design.product?.prgRelease?.id
  const prgUrl = design.product?.prgRelease?.prgUrl
  if (!releaseId || !prgUrl) {
    messageStore.error(t('project.prgUnavailable'))
    return
  }

  const ticket = prgInstallerTicketCache.take(releaseId)
  if (!ticket) {
    void preparePreviewPrg(design)
    messageStore.error(t('project.prgInstallerPreviewFailed'))
    return
  }

  void downloadPackageFile(prgUrl, design.product?.name || design.name, 'prg')
  window.location.href = buildPrgInstallerDeepLink(ticket)
  messageStore.info(t('project.prgInstallerOpening'))
  showPrgInstallerGuideNotification(t('project.prgInstallerTroubleshoot'))
}

// 检查是否有可下载的安装包
const hasDownloadablePackage = (design: DesignListItem): boolean => {
  return !!(design.product?.release?.packageUrl)
}

// 检查是否有新版本需要上传
const hasNewRelease = (design: DesignListItem): boolean => {
  const releaseExists = !!design.product?.release
  if (!releaseExists) return false

  const releaseUpdatedAt = (design.product?.release as { updatedAt?: string | number })?.updatedAt
  const lastGoLive = (design.product as { lastGoLive?: string | number | null })?.lastGoLive

  if (!releaseUpdatedAt) return false
  if (!lastGoLive) return true

  return dayjs(releaseUpdatedAt).isAfter(dayjs(lastGoLive))
}

// 处理提交成功
const handleSubmitSuccess = (payload: { mode: 'submit' | 'prg-build' }) => {
  submittedTaskPollUntil = Date.now() + 60_000
  void refreshPackagingStatus()
  if (payload.mode !== 'prg-build' || !prgInstallerPromptState.takeBuildHint()) return
  showPrgInstallerGuideNotification(t('project.prgInstallerBuildHint'))
}


const handleGoLiveSuccess = async () => { publishInitialized = false; await fetchDesigns(); emit('updated') }

const props = defineProps<{ designUid: string; informationTarget: HTMLElement; activeSection?: 'overview' | PublishSection }>()
const emit = defineEmits<{ updated: []; 'select-section': [section: PublishSection] }>()
const design = ref<DesignListItem | null>(null)
const loadError = ref('')
let active = true
let loadVersion = 0
let submittedTaskPollUntil = 0
let publishInitialized = false
async function fetchDesigns() {
  const version = ++loadVersion
  try {
    const response = await designApi.getDesignByUid(props.designUid, getCurrentDeviceParams())
    if (!active || version !== loadVersion) return
    if (response.code !== 0 || !response.data) throw new Error(response.msg || t('project.loadDesignFailed'))
    if (!isAdminUser.value && response.data.user?.id !== userStore.userInfo?.id) {
      design.value = null
      emit('updated')
      return
    }
    design.value = response.data
    if (userStore.isStudioConsumer) {
      const access = await designUnlocksApi.status(props.designUid)
      if (!active || version !== loadVersion) return
      design.value = { ...response.data, canInstall: access.data?.canInstall }
    }
    loadError.value = ''
    await nextTick()
    if (!active || version !== loadVersion) return
    if (!publishInitialized && response.data.product?.appId) {
      publishForm.value?.show(response.data)
      publishInitialized = true
    }
  } catch (error) {
    if (active && version === loadVersion) loadError.value = error instanceof Error ? error.message : t('project.loadDesignFailed')
  }
}
// Polling must preserve the design and publishing form; only packaging fields change.
let packagingRequestPending = false
async function refreshPackagingStatus() {
  if (packagingRequestPending || !design.value) return
  packagingRequestPending = true
  const version = loadVersion
  const deviceId = currentDeviceId.value
  const product = design.value.product
  try {
    const response = await designApi.getDesignByUid(props.designUid, getCurrentDeviceParams())
    if (!active || version !== loadVersion || deviceId !== currentDeviceId.value || design.value?.product !== product) return
    if (response.code !== 0 || !response.data?.product) return
    if (!isAdminUser.value && response.data.user?.id !== userStore.userInfo?.id) return
    const latest = response.data.product
    const target = product ?? (design.value!.product = { id: latest.id, appId: latest.appId })
    target.packagingLog = latest.packagingLog
    target.prgPackagingLog = latest.prgPackagingLog
    target.release = latest.release
    target.prgRelease = latest.prgRelease
  } catch {
    // Keep the last known status on transient failures and retry on the next tick.
  } finally {
    packagingRequestPending = false
  }
}
watch(() => [design.value, currentDeviceId.value], () => {
  if (design.value) observeOnboardingDesign(design.value, currentDeviceId.value)
}, { deep: true })
watch(currentDeviceId, () => { void fetchDesigns() })
onMounted(() => {
  void fetchDesigns()
  prgClockTimer = setInterval(() => {
    nowMs.value = Date.now()
    const product = design.value?.product
    if (Date.now() < submittedTaskPollUntil || [product?.packagingLog, product?.prgPackagingLog].some(log => log && !['complete', 'completed', 'failed', 'cancelled', 'canceled'].includes(log.packagingStatus) && (log.rank != null || ['init', 'pending', 'processing', 'cancel_requested'].includes(log.packagingStatus)))) void refreshPackagingStatus()
  }, 10_000)
})
onUnmounted(() => {
  active = false
  loadVersion++
  if (prgClockTimer) clearInterval(prgClockTimer)
})
</script>
<style scoped>
.design-management { margin-top: 16px; }
.management-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.management-heading > span { font-size: 9px; letter-spacing: 1.2px; color: var(--studio-text-subtle); }
.management-heading :deep(.device-display-container) { min-width: 0; }
.management-heading :deep(.device-info) {
  min-width: 0;
  min-height: 28px;
  gap: 6px;
  padding: 3px 6px;
  border-color: transparent;
  border-radius: 6px;
  background: transparent;
}
.management-heading :deep(.device-info:hover) {
  border-color: var(--studio-border);
  background: var(--studio-surface-soft);
  box-shadow: none;
}
.management-heading :deep(.device-avatar) {
  width: 20px;
  height: 20px;
  flex-basis: 20px;
  border: 0;
  background: transparent;
}
.management-heading :deep(.device-avatar img) { padding: 0; background: transparent; }
.management-heading :deep(.device-name) { font-size: 11px; }
</style>
