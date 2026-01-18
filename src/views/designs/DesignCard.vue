<template>
  <!-- 设计卡片 -->
  <el-card class="design-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <!-- 标题单独一行 -->
        <div class="title-row">
          <span class="title">{{ design.name }}</span>
           <!-- 状态小点 + Tooltip，不占据标题高度 -->
          <el-tooltip
            :content="design.designStatus === 'rejected' && design.reviewComment ? design.reviewComment : statusText"
            placement="top"
          >
            <span
              class="status-dot"
              :style="{ backgroundColor: statusColor }"
            />
          </el-tooltip>
        </div>
        <!-- 状态和操作按钮第二行 -->
        <div class="status-actions-row">
          <div class="header-actions">
            <el-button-group>
              <!-- 复制设计名称 -->
              <el-button v-if="isMerchantUser" type="primary" size="small" link @click="emit('copy-name', design.name)" title="Copy Design Name">
                <el-icon>
                  <DocumentCopy />
                </el-icon>
              </el-button>
              <!-- 编辑 -->
              <el-button v-if="isMerchantUser" type="primary" size="small" link @click="emit('edit', design)">
                <el-icon>
                  <Edit />
                </el-icon>
              </el-button>
              <!-- 删除 -->
              <el-button type="danger" size="small" link @click="emit('delete', design)">
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </el-button-group>
          </div>
        </div>
      </div>
    </template>
    <div class="design-info">
      <div class="design-background" v-if="designImageUrl">
        <img :src="designImageUrl" :alt="design.name" class="background-image" />
        <div class="creator-badge" v-if="showCreator">
          <span>{{ creatorName }}</span>
        </div>
      </div>
      <div class="meta">
        <span>App ID: {{ design.product?.appId }}</span>
        <span>Design: {{ design.designUid }}</span>
        <div class="last-go-live-row">
          <span>Last Go Live: {{ lastGoLiveText }}</span>
          <el-tooltip v-if="hasNewRelease" content="New version available to upload" placement="top">
            <span class="new-release-indicator" role="img" aria-label="New version available to upload">
              <span class="dot"></span>
            </span>
          </el-tooltip>
        </div>
        <div class="package-info" v-if="design.product?.packagingLog?.rank || design.product?.prgPackagingLog?.rank">
          <div v-if="design.product?.packagingLog?.rank" class="package-info-item">
            <strong>IQ build in queue:</strong>
            <span class="package-rank">Position #{{ design.product.packagingLog.rank }}</span>
          </div>
          <div v-if="design.product?.prgPackagingLog?.rank" class="package-info-item">
            <strong>PRG build in queue:</strong>
            <span class="package-rank">Position #{{ design.product.prgPackagingLog.rank }}</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <el-button v-if="currentUserId === 1 || design.user.id === currentUserId" type="default" size="small" @click="emit('open', design)">✏️ Edit</el-button>
        <el-button v-if="!design.product?.prgPackagingLog?.rank && design.product?.prgRelease &&design.product?.prgRelease?.updatedAt < design.updatedAt" type="default" size="small" @click="emit('build-prg', design)" :loading="loadingStates.prgBuild.has(design.id)">
          🛠 Build PRG
        </el-button>
        <el-button v-if="design.product?.prgRelease && design.product?.prgRelease.updatedAt > design.updatedAt" type="default" size="small" @click="emit('run-prg', design)">⬇ PRG</el-button>
        <el-button
          v-if="isMerchantUser && !design.product?.packagingLog?.rank && (design.designStatus === 'draft' || design.updatedAt > (design.product?.release?.updatedAt ?? 0))"
          type="info"
          size="small"
          @click="emit('submit', design)"
          :loading="loadingStates.submit.has(design.id)"
          :disabled="!!design.product?.packagingLog?.rank">
          📦 Build IQ
        </el-button>
        <el-button v-if="isMerchantUser && hasDownloadablePackage && design.product?.release && design.product?.release.updatedAt > design.updatedAt " type="info" size="small" @click="emit('download-package', design)">⬇ IQ</el-button>
        <el-button v-if="isMerchantUser && design.product?.release && design.product?.release.updatedAt > design.updatedAt" type="info" size="small" @click="emit('go-live', design)">🚀 Publish</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Design } from '@/types/api/design'
import { Edit, Delete, DocumentCopy } from '@element-plus/icons-vue'

interface LoadingStates {
  submit: Set<number>
  copy: Set<number>
  delete: Set<number>
  favorite: Set<number>
  prgBuild: Set<number>
}

const props = defineProps<{
  design: Design
  isMerchantUser: boolean
  showCreator: boolean
  loadingStates: LoadingStates
  currentUserId: number | null
  statusText: string
  statusColor: string
  lastGoLiveText: string
  creatorName: string
  designImageUrl: string
  hasNewRelease: boolean
  hasDownloadablePackage: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', design: Design): void
  (e: 'delete', design: Design): void
  (e: 'open', design: Design): void
  (e: 'build-prg', design: Design): void
  (e: 'run-prg', design: Design): void
  (e: 'submit', design: Design): void
  (e: 'download-package', design: Design): void
  (e: 'go-live', design: Design): void
  (e: 'copy-name', name: string): void
}>()

const design = computed(() => props.design)
const isMerchantUser = computed(() => props.isMerchantUser)
const showCreator = computed(() => props.showCreator)
const loadingStates = computed(() => props.loadingStates)
const currentUserId = computed(() => props.currentUserId)
const statusText = computed(() => props.statusText)
const statusColor = computed(() => props.statusColor)
const lastGoLiveText = computed(() => props.lastGoLiveText)
const creatorName = computed(() => props.creatorName)
const designImageUrl = computed(() => props.designImageUrl)
const hasNewRelease = computed(() => props.hasNewRelease)
const hasDownloadablePackage = computed(() => props.hasDownloadablePackage)
</script>

<style scoped>
.design-card {
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  overflow: hidden;
}

.design-card :deep(.el-card__body) {
  padding: 8px;
}

.design-card :deep(.el-card__header) {
  padding: 6px 8px;
}

.design-card:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

.card-header {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 8px;
  padding: 0 4px;
  position: relative;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  grid-column: 1;
  grid-row: 1 / span 2; /* 占两行高度 */
}

.title {
  font-size: 24px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.2;
  flex: 1 1 auto;
  min-width: 0; /* 允许在 flex 容器中收缩以便省略号生效 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-actions-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  grid-column: 2;
  grid-row: 1; /* 位于右上角 */
}

.status-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--el-color-info);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
  margin-left: 6px;
  flex-shrink: 0;
}

.design-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.design-background {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.creator-badge {
  position: absolute;
  top: 0px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  backdrop-filter: blur(3px);
}

@media (prefers-color-scheme: dark) {
  .creator-badge {
    background-color: rgba(255, 255, 255, 0.2);
  }
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 8px;
  padding-top: 8px;
}

.last-go-live-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.last-go-live-row .new-release-indicator {
  position: static;
  top: auto;
  right: auto;
  width: 10px;
  height: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
}

.last-go-live-row .new-release-indicator .dot {
  width: 8px;
  height: 8px;
}

.new-release-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 12px;
  height: 12px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.new-release-indicator .dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #ff4d4f;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

.package-info-item {
  font-size: 11px;
}

.package-rank {
  color: #ff4d4f;
}

.actions {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  padding: 3px;
  justify-content: center;
}

.actions .el-button {
  font-size: 10px;
  padding: 4px 6px;
  margin: 0;
  flex: 0 0 auto;
  min-width: 56px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
}

/* Actions button layout: equal width, up to 3 per row, left aligned */
.design-info .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.design-info .actions .el-button {
  flex: 0 0 calc((100% - 16px) / 3);
  box-sizing: border-box;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions .el-button-group {
  display: flex;
  gap: 2px;
}

.header-actions .el-button {
  height: 28px;
  font-size: 14px;
}

.header-actions .el-button:hover {
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.header-actions .el-button.el-button--primary.is-link {
  color: var(--el-text-color-regular);
}

.header-actions .el-button.el-button--primary.is-link:hover {
  color: var(--el-color-primary);
}

.header-actions .el-button.el-button--danger.is-link {
  color: var(--el-text-color-regular);
}

.header-actions .el-button.el-button--danger.is-link:hover {
  color: var(--el-color-danger);
}

@media screen and (max-width: 768px) {
  .header-actions .el-button {
    padding: 2px 6px;
  }
}
</style>
