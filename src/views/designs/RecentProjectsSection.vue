<template>
  <div>
    <div class="page-header">
      <h2>Recent Projects</h2>
    </div>
    <el-row :gutter="24" class="design-grid">
      <el-col
        v-for="design in designs"
        :key="design.id"
        :xs="24"
        :sm="8"
        :md="6"
        :lg="4"
        :xl="4"
      >
        <DesignCard
          :design="design"
          :is-merchant-user="false"
          :is-admin-user="false"
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
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { designApi } from '@/api/wristo/design'
import type { Design } from '@/types/api/design'
import DesignCard from '@/views/designs/DesignCard.vue'
import dayjs from 'dayjs'

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

const designs = computed(() => props.designs)

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
</script>

<style scoped>
.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

.design-grid {
  margin-top: 16px;
}
</style>
