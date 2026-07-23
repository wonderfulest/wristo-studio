<template>
  <div>
    <div class="page-header">
      <h2>{{ t('project.recentProjects') }}</h2>
    </div>
    <!-- <el-input
      v-model="searchQuery"
      placeholder="Search project name"
      clearable
      class="search-input"
    /> -->
    <el-row :gutter="24" class="design-grid">
      <!-- 空卡片：用于引导创建新应用 -->
      <el-col
        :xs="24"
        :sm="12"
        :md="6"
        :lg="4"
        :xl="4"
      >
        <div class="empty-card" @click="handleCreateNewProject">
          <div class="empty-card-visual">
            <div class="empty-card-circle">
              <span class="empty-card-plus">+</span>
            </div>
          </div>
          <div class="empty-card-text">{{ t('project.newProject') }}</div>
        </div>
      </el-col>
      <el-col
        v-for="design in filteredDesigns"
        :key="design.id"
        :xs="24"
        :sm="12"
        :md="6"
        :lg="4"
        :xl="4"
      >
        <DesignCard
          :design="design"
          :is-merchant-user="isMerchantUser"
          :is-admin-user="isAdminUser"
          :can-delete-design="canDeleteDesign"
          :show-creator="false"
          :loading-states="loadingStatesPlain"
          :current-user-id="userStore.userInfo?.id ?? null"
          :status-text="getStatusText(design.designStatus)"
          :status-color="getStatusColor(design.designStatus)"
          :last-go-live-text="formatDateNullable(design.product?.lastGoLive ?? null)"
          :creator-name="getCreatorName(design)"
          :design-image-url="getDesignImageUrl(design)"
          :has-new-release="hasNewRelease(design)"
          :has-downloadable-package="hasDownloadablePackage(design)"
          :show-package-download="false"
          @open="emit('open', design)"
          @delete="emit('delete', design)"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { designApi } from '@/api/wristo/design'
import type { Design } from '@/types/api/design'
import DesignCard from '@/views/designs/DesignCard.vue'
import dayjs from 'dayjs'
import emitter from '@/utils/eventBus'
import { useI18n } from '@/i18n'

const { t } = useI18n()

// 是否为商家用户（拥有 ROLE_MERCHANT 角色）
const isMerchantUser = computed(() => {
  const roles = userStore.userInfo?.roles || []
  return roles.some((role) => role.roleCode === 'ROLE_MERCHANT')
})

// Whether the current user is an admin (has ROLE_ADMIN)
const isAdminUser = computed(() => {
  const roles = userStore.userInfo?.roles || []
  return roles.some((role) => role.roleCode === 'ROLE_ADMIN')
})

const canDeleteDesign = computed(() => {
  if (userStore.hasFullStudioAccess) return true
  const level = userStore.studioMembership?.level || 'free'
  return level !== 'free'
})

const props = defineProps<{
  designs: Design[]
}>()

const emit = defineEmits<{
  (e: 'open', design: Design): void
  (e: 'delete', design: Design): void
}>()

const userStore = useUserStore()

interface LoadingStates {
  submit: Set<number>
  copy: Set<number>
  delete: Set<number>
  favorite: Set<number>
  prgBuild: Set<number>
}

const loadingStates = computed<LoadingStates>(() => ({
  submit: new Set<number>(),
  copy: new Set<number>(),
  delete: new Set<number>(),
  favorite: new Set<number>(),
  prgBuild: new Set<number>(),
}))

const loadingStatesPlain = computed(() => loadingStates.value)
const searchQuery = ref('')

const filteredDesigns = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = props.designs || []
  if (q) {
    list = list.filter((d) => (d.name || '').toLowerCase().includes(q))
  }
  // 只显示前 5 个
  return list.slice(0, 5)
})

const getDesignImageUrl = (design: Design) => {
  return designApi.getDesignImageUrl(design, true) || ''
}

const getStatusText = (status: Design['designStatus']) => {
  const statusMap: Record<string, string> = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    rejected: t('status.rejected'),
  }
  return statusMap[status] || t('status.unknown')
}

const getStatusColor = (status: Design['designStatus']) => {
  const statusMap: Record<string, string> = {
    draft: '#606266',
    submitted: '#909399',
    approved: '#67C23A',
    rejected: '#F56C6C',
  }
  return statusMap[status] || '#909399'
}

const formatDateNullable = (date: string | number | null | undefined) => {
  if (!date) return t('common.never')
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const getCreatorName = (design: Design) => {
  return design.user?.username || t('common.unknownUser')
}

const hasDownloadablePackage = (design: Design): boolean => {
  return !!(design.product?.release?.packageUrl)
}

const hasNewRelease = (design: Design): boolean => {
  const releaseExists = !!design.product?.release
  if (!releaseExists) return false

  const releaseUpdatedAt = (design.product?.release as any)?.updatedAt
  const lastGoLive = (design.product as any)?.lastGoLive

  if (!releaseUpdatedAt) return false
  if (!lastGoLive) return true

  return dayjs(releaseUpdatedAt).isAfter(dayjs(lastGoLive))
}

const handleCreateNewProject = () => {
  emitter.emit('open-new-project-dialog')
}
</script>

<style scoped>
.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--studio-text);
}

.search-input {
  margin-top: 8px;
  max-width: 320px;
}

.design-grid {
  margin-top: 16px;
}

/* 在最近项目区仅保留 DesignCard 底部操作区中的第一个按钮，隐藏其余按钮 */
.design-grid :deep(.actions .el-button:nth-child(n + 2)) {
  display: none;
}

/* 在最近项目区仅显示右上角删除按钮 */
.design-grid :deep(.header-actions .el-button:not(.delete-action)) {
  display: none;
}

.empty-card {
  --project-watchface-size: 82%;

  height: 100%;
  min-height: 180px;
  border-radius: var(--studio-radius-lg);
  border: 1.5px dashed var(--studio-border-strong);
  background: var(--studio-surface-raised);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.empty-card-visual {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  margin-bottom: 6px;
}

.empty-card-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--project-watchface-size);
  height: var(--project-watchface-size);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--studio-surface-soft);
  border: 1px solid var(--studio-border);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-card-plus {
  font-size: 108px;
  line-height: 1;
  color: var(--studio-primary);
  font-weight: 500;
}

.empty-card-text {
  font-size: 18px;
  color: var(--studio-text);
  font-weight: 750;
}

.empty-card:hover {
  transform: translateY(-2px);
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
  box-shadow: var(--studio-shadow-md);
}
</style>
