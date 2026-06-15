<template>
  <div class="new-projects">
    <RecentProjectsSection
      :designs="recentDesigns"
      @open="handleOpenRecentDesign"
      @delete="confirmDeleteRecentDesign"
    />

    <el-divider />

    <SampleProjectsSection
      :designs="designs"
      @select-template="handleOpenFromTemplate"
    />

    <NewProjectDialog
      v-model="dialogVisible"
      :initial-name="projectName"
      @confirm="handleConfirmDialog"
    />

    <el-dialog v-model="deleteDialogVisible" :title="t('project.confirmDelete')" width="30%">
      <span>{{ t('project.deleteBody') }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button
            type="danger"
            @click="deleteRecentDesign"
            :loading="deletingDesignId === designToDelete?.id"
          >
            {{ t('project.confirmDeleteButton') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, onBeforeUnmount, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { useBaseStore } from '@/stores/baseStore'
import type { ApiResponse, PageResponse } from '@/types/api/api'
import type { Design, DesignPageParams } from '@/types/api/design'
import RecentProjectsSection from '@/views/designs/RecentProjectsSection.vue'
import SampleProjectsSection from '@/views/designs/SampleProjectsSection.vue'
import NewProjectDialog from '@/views/designs/NewProjectDialog.vue'
import emitter from '@/utils/eventBus'
import { useI18n } from '@/i18n'

const messageStore = useMessageStore()
const userStore = useUserStore()
const router = useRouter()
const baseStore = useBaseStore()
const { t } = useI18n()

const getCurrentDeviceParams = () => {
  const deviceId = (userStore.userInfo as any)?.device?.deviceId
  return deviceId ? { device: deviceId } : undefined
}

const designs = ref<Design[]>([])
const recentDesigns = ref<Design[]>([])
const dialogVisible = ref(false)
const projectName = ref('')
const currentTemplate = ref<Design | null>(null)
const deleteDialogVisible = ref(false)
const designToDelete = ref<Design | null>(null)
const deletingDesignId = ref<number | null>(null)

const generateRandomProjectName = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * letters.length)
    suffix += letters[index]
  }
  return `App ${suffix}`
}

const showUpgradePrompt = () => {
  const max = userStore.studioMembership?.maxDesigns
  messageStore.warning(max == null ? t('membership.freeCreateLimitReached') : t('membership.createLimitReached', { max }))
}

const canCreateProject = () => {
  if (userStore.canCreateDesign) {
    return true
  }
  showUpgradePrompt()
  router.push('/pricing')
  return false
}

const openNewProjectDialog = (options: { interactive?: boolean } = {}) => {
  if (!userStore.canCreateDesign) {
    if (options.interactive) {
      canCreateProject()
    }
    return
  }
  currentTemplate.value = null
  projectName.value = generateRandomProjectName()
  dialogVisible.value = true
}

// 打开弹框，准备从模板创建新项目
const handleOpenFromTemplate = (design: Design) => {
  if (!canCreateProject()) return
  currentTemplate.value = design
  projectName.value = generateRandomProjectName()
  dialogVisible.value = true
}

// 确认创建：
// - 如果选择了 sample（currentTemplate 有值），复制模板并打开画布
// - 如果没有选择 sample，创建一个全新的应用并打开画布
const handleConfirmDialog = async (inputName: string) => {
  if (!canCreateProject()) return
  const name = (inputName || projectName.value).trim() || generateRandomProjectName()

  try {
    // 情况一：从 Sample 复制
    if (currentTemplate.value) {
      const copyRes = await designApi.createDesignByCopy({ uid: currentTemplate.value.designUid }) as ApiResponse<Design>
      if (!copyRes || !copyRes.data) {
        messageStore.error(copyRes?.msg || t('project.copyTemplateFailed'))
        return
      }

      const newDesignUid = copyRes.data.designUid

      // 更新新设计名称
      if (name) {
        await designApi.updateDesign({
          uid: newDesignUid,
          name,
        } as any)
      }

      const detailRes = await designApi.getDesignByUid(newDesignUid, getCurrentDeviceParams()) as ApiResponse<Design>
      if (!detailRes || detailRes.code !== 0 || !detailRes.data) {
        messageStore.error(detailRes?.msg || t('project.loadNewDesignFailed'))
        return
      }

      const designData = detailRes.data
      baseStore.watchFaceName = designData.name
      baseStore.appId = designData.product?.appId || -1

      router.push('/design?id=' + designData.designUid)
      dialogVisible.value = false
      currentTemplate.value = null
      await userStore.refreshUserInfo()
      return
    }

    // 情况二：未选择 Sample，创建全新空白应用
    const createRes = await designApi.createDesign({
      name,
      description: '',
    } as any) as ApiResponse<Design>

    if (!createRes || !createRes.data) {
      messageStore.error(createRes?.msg || t('project.createProjectFailed'))
      return
    }

    const newDesign = createRes.data
    baseStore.watchFaceName = newDesign.name
    baseStore.appId = newDesign.product?.appId || -1

    router.push('/design?id=' + newDesign.designUid)
    dialogVisible.value = false
    await userStore.refreshUserInfo()
  } catch (error: any) {
    console.error('[NewProjects] handleConfirmDialog error:', error)
    messageStore.error(error?.response?.data?.msg || t('project.openDesignFailed'))
  }
}

// 打开最近项目到画布（不复制）
const handleOpenRecentDesign = async (design: Design) => {
  try {
    const res = await designApi.getDesignByUid(design.designUid, getCurrentDeviceParams()) as ApiResponse<Design>
    if (!res || res.code !== 0 || !res.data) {
      messageStore.error(res?.msg || t('project.loadDesignFailed'))
      return
    }
    const designData = res.data
    baseStore.watchFaceName = designData.name
    baseStore.appId = designData.product?.appId || -1
    router.push('/design?id=' + designData.designUid)
  } catch (error: any) {
    console.error('[NewProjects] handleOpenRecentDesign error:', error)
    messageStore.error(t('project.openDesignFailed'))
  }
}

const confirmDeleteRecentDesign = (design: Design) => {
  designToDelete.value = design
  deleteDialogVisible.value = true
}

const deleteRecentDesign = async () => {
  const design = designToDelete.value
  if (!design || deletingDesignId.value === design.id) return

  try {
    deletingDesignId.value = design.id
    const response = await designApi.deleteDesign(design.designUid)
    if (response.code === 0) {
      messageStore.success(t('project.deleteSuccessful'))
      deleteDialogVisible.value = false
      designToDelete.value = null
      await fetchRecentDesigns()
      await userStore.refreshUserInfo()
    } else {
      messageStore.error(response.msg || t('project.deleteFailed'))
    }
  } catch (error: any) {
    console.error('[NewProjects] deleteRecentDesign error:', error)
    messageStore.error(t('project.deleteFailed'))
  } finally {
    deletingDesignId.value = null
  }
}

const fetchDesigns = async () => {
  try {
    const params: { device?: string; populate?: string } = {
      populate: 'user,product,cover',
    }

    const deviceId = (userStore.userInfo as any)?.device?.deviceId
    if (deviceId) {
      params.device = deviceId
    }

    const response: ApiResponse<Design[]> = await designApi.getTemplateDesigns(params)

    if (response.code === 0 && response.data) {
      const all = response.data
      designs.value = all
    } else {
      messageStore.error(response.msg || t('project.getSamplesFailed'))
    }
  } catch (error: any) {
    console.error('[NewProjects] fetchDesigns error:', error)
    messageStore.error(t('project.getSamplesFailed'))
  }
}

// 获取最近项目（最近 12 个）
const fetchRecentDesigns = async () => {
  try {
    const params: DesignPageParams = {
      pageNum: 1,
      pageSize: 5,
      orderBy: 'updated_at:desc',
      populate: 'user,product,payment,release,cover,category,bundle,package_log',
    }

    const deviceId = (userStore.userInfo as any)?.device?.deviceId
    if (deviceId) {
      params.device = deviceId
    }

    const response: ApiResponse<PageResponse<Design>> = await designApi.getDesignPage(params)
    if (response.code === 0 && response.data) {
      recentDesigns.value = response.data.list
    } else {
      messageStore.error(response.msg || t('project.getRecentFailed'))
    }
  } catch (error: any) {
    console.error('[NewProjects] fetchRecentDesigns error:', error)
    messageStore.error(t('project.getRecentFailed'))
  }
}

// 监听来自全局的“打开新项目弹框”事件，支持在 /designs/new-projects 页面重复触发
const openDialogHandler = () => {
  openNewProjectDialog({ interactive: true })
}

emitter.on('open-new-project-dialog', openDialogHandler)

onMounted(() => {
  fetchDesigns()
  fetchRecentDesigns()
  // 进入 New Projects 页面时立即弹出新项目名称对话框；超出创作数量限制时静默停留在列表页
  openNewProjectDialog()
})

// 被 keep-alive 缓存后，每次重新激活也要弹一次
onActivated(() => {
  openNewProjectDialog()
})

onBeforeUnmount(() => {
  emitter.off('open-new-project-dialog', openDialogHandler)
})

onDeactivated(() => {
  emitter.off('open-new-project-dialog', openDialogHandler)
})
</script>

<style scoped>
.new-projects {
  padding: 12px 0 32px;
  color: var(--studio-text);
}

.new-projects :deep(.el-divider--horizontal) {
  margin: 20px 0 16px;
  border-top-color: var(--studio-border);
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0 0 4px;
}

.subtitle {
  margin: 0;
  color: var(--studio-text-subtle);
  font-size: 13px;
}

.design-grid {
  margin-top: 16px;
}

.section-header {
  margin-top: 32px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.sample-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  box-shadow: var(--studio-shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.sample-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--studio-shadow-md);
}

.thumb-wrapper {
  width: 100%;
  padding-top: 100%;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: var(--studio-surface-soft);
}

.thumb-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sample-name {
  margin-top: 8px;
  font-size: 13px;
  color: var(--studio-text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 40px;
  padding: 20px 0;
}
</style>
