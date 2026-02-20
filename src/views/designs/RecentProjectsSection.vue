<template>
  <div>
    <div class="page-header">
      <h2>Recent Projects</h2>
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
        :md="8"
        :lg="6"
        :xl="4"
      >
        <div class="empty-card" @click="handleCreateNewProject">
          <div class="empty-card-visual">
            <div class="empty-card-circle">
              <span class="empty-card-plus">+</span>
            </div>
          </div>
          <div class="empty-card-text">New Project</div>
        </div>
      </el-col>
      <el-col
        v-for="design in filteredDesigns"
        :key="design.id"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="4"
      >
        <DesignCard
          :design="design"
          :is-merchant-user="isMerchantUser"
          :is-admin-user="isAdminUser"
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
          @open="emit('open', design)"
          @copy="() => {}"
          @edit="() => {}"
          @delete="() => {}"
          @build-prg="() => {}"
          @run-prg="() => {}"
          @submit="() => {}"
          @download-package="() => {}"
          @go-live="() => {}"
          @copy-name="() => {}"
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

const props = defineProps<{
  designs: Design[]
}>()

const emit = defineEmits<{
  (e: 'open', design: Design): void
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
    draft: 'Draft',
    submitted: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    packaged: 'Packaged',
    published: 'Published',
  }
  return statusMap[status] || 'Unknown'
}

const getStatusColor = (status: Design['designStatus']) => {
  const statusMap: Record<string, string> = {
    draft: '#606266',
    submitted: '#909399',
    approved: '#67C23A',
    rejected: '#F56C6C',
    packaged: '#E6A23C',
    published: '#409EFF',
  }
  return statusMap[status] || '#909399'
}

const formatDateNullable = (date: string | number | null | undefined) => {
  if (!date) return 'Never'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const getCreatorName = (design: Design) => {
  return design.user?.username || 'Unknown User'
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
}

.search-input {
  margin-top: 8px;
  max-width: 320px;
}

.design-grid {
  margin-top: 16px;
}

.empty-card {
  height: 100%;
  min-height: 180px;
  border-radius: 12px;
  border: 2px dashed #d3d7de;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.empty-card-visual {
  position: relative;
  width: 340px;
  height: 340px;
  max-width: 100%;
  max-height: 100%;
  margin-bottom: 6px;
}

.empty-card-circle {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #000;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-card-plus {
  font-size: 108px;
  line-height: 1;
  color: #fff;
  font-weight: 700;
}

.empty-card-text {
  font-size: 18px;
  color: #111827;
  font-weight: 600;
}

.empty-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.12);
}
</style>
