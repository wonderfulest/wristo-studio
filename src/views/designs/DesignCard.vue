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
            v-if="isMerchantUser || isAdminUser"
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
              <el-button v-if="isMerchantUser" type="primary" size="small" link @click="emit('copy-name', design.name)" :title="t('card.copyDesignName')">
                <el-icon>
                  <DocumentCopy />
                </el-icon>
              </el-button>
              <!-- 查看详情 -->
              <el-button v-if="isMerchantUser" type="primary" size="small" link @click="emit('edit', design)" :title="t('editor.view')">
                <el-icon>
                  <View />
                </el-icon>
              </el-button>
              <!-- 删除（仅管理员和自己的应用可见） -->
              <el-button
                v-if="canDeleteDesign && (isAdminUser || design.user.id === currentUserId)"
                class="delete-action"
                type="danger"
                size="small"
                link
                @click="emit('delete', design)"
                :title="t('common.delete')"
              >
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
      <div class="design-background">
        <img
          v-if="designImageUrl"
          :src="designImageUrl"
          :alt="design.name"
          class="background-image"
        />
        <div v-else class="placeholder-circle"></div>
        <div class="creator-badge" v-if="showCreator">
          <span>{{ creatorName }}</span>
        </div>
      </div>
      <div class="meta">
       
        <div v-if="isMerchantUser">
           <span>{{ t('card.appId') }}: {{ design.product?.appId }}</span> 
           <div v-if="(isMerchantUser || isAdminUser) && design.product?.appId" class="app-ops-entry">
            <div class="score-pill">
              <span class="score-label">{{ t('card.score') }}</span>
              <span class="score-value">{{ appScoreTotalText }}</span>
            </div>
            <el-tooltip :content="t('card.openOperations')" placement="top">
              <button class="ops-icon-btn" type="button" @click.stop="goToOperations">
                <Icon icon="material-symbols:trending-up-rounded" />
              </button>
            </el-tooltip>
          </div>
        </div>
        
        <span v-if="isMerchantUser">{{ t('card.design') }}: {{ design.designUid }}</span>
        <!-- 显示最后一次设计更新时间 -->
        <div v-if="isMerchantUser" class="last-go-live-row">
          <span>{{ t('card.lastUpdated') }}: {{ lastUpdatedText }}</span>
        </div>
        <div v-if="isMerchantUser && hasDownloadablePackage" class="last-go-live-row">
          <span>{{ t('card.lastPackage') }}: {{ lastPackageTimeText }}</span>
        </div>
        <div v-if="isMerchantUser" class="last-go-live-row">
          <span>{{ t('card.lastGoLive') }}: {{ lastGoLiveText }}</span>
          <el-tooltip v-if="hasNewRelease" :content="t('card.newRelease')" placement="top">
            <span class="new-release-indicator" role="img" :aria-label="t('card.newRelease')">
              <span class="dot"></span>
            </span>
          </el-tooltip>
        </div>
        <div class="package-info" v-if="packageRows.length">
          <div
            v-for="row in packageRows"
            :key="row.key"
            class="package-info-item"
            :class="`package-${row.tone}`"
          >
            <strong>{{ row.label }}:</strong>
            <span class="package-rank" :class="{ 'packaging-progress': row.isPackaging }">
              {{ row.value }}<span v-if="row.isPackaging" class="ellipsis">...</span>
            </span>
            <el-tooltip
              v-if="row.canViewBuildLog"
              :content="t('editDesign.viewBuildLog')"
              placement="top"
            >
              <button class="build-log-btn" type="button" @click.stop="openBuildLog(row.logId)">
                <Icon icon="material-symbols:article-outline-rounded" />
              </button>
            </el-tooltip>
          </div>
        </div>
      </div>
      <div class="actions">
        <el-button v-if="currentUserId === 1 || design.user.id === currentUserId" type="default" size="small" @click="emit('open', design)">
          <el-icon><Edit /></el-icon>
          {{ t('card.edit') }}
        </el-button>
        <el-button
          type="default"
          size="small"
          @click="emit('copy', design)"
          :loading="loadingStates.copy.has(design.id)"
        >
          <el-icon><DocumentCopy /></el-icon>
          {{ t('card.duplicate') }}
        </el-button>
        <el-button v-if="showBuildPrgButton" type="default" size="small" @click="emit('build-prg', design)" :loading="loadingStates.prgBuild.has(design.id)">
          <el-icon><Box /></el-icon>
          {{ t('card.buildPrg') }}
        </el-button>
        <el-button v-if="showRunPrgButton" type="default" size="small" @click="emit('run-prg', design)">
          <el-icon><Download /></el-icon>
          PRG
        </el-button>
        <el-button
          v-if="showBuildIqButton"
          type="info"
          size="small"
          @click="emit('submit', design)"
          :loading="loadingStates.submit.has(design.id)"
          :disabled="!!design.product?.packagingLog?.rank">
          <el-icon><Box /></el-icon>
          {{ t('card.buildIq') }}
        </el-button>
        <el-button v-if="showDownloadIqButton" type="info" size="small" @click="emit('download-package', design)">
          <el-icon><Download /></el-icon>
          IQ
        </el-button>
        <el-button v-if="showPublishButton" type="info" size="small" @click="emit('go-live', design)">
          <el-icon><Upload /></el-icon>
          {{ t('card.publish') }}
        </el-button>
      </div>
    </div>
  </el-card>

  <el-drawer
    v-model="operationsDrawerVisible"
    :title="t('card.appOperations')"
    direction="rtl"
    size="min(1100px, 92vw)"
    destroy-on-close
  >
    <AppDetail v-if="operationsDrawerVisible && appId" :app-id="appId" />
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import type { Design } from '@/types/api/design'
import type { ProductPackagingLogVo } from '@/types/api/product'
import { Box, Delete, DocumentCopy, Download, Edit, Upload, View } from '@element-plus/icons-vue'
import { Icon } from '@iconify/vue'
import AppDetail from '@/views/meter/AppDetail.vue'
import { useI18n } from '@/i18n'

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
  isAdminUser: boolean
  canDeleteDesign: boolean
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
  (e: 'copy', design: Design): void
  (e: 'build-prg', design: Design): void
  (e: 'run-prg', design: Design): void
  (e: 'submit', design: Design): void
  (e: 'download-package', design: Design): void
  (e: 'go-live', design: Design): void
  (e: 'copy-name', name: string): void
}>()

const { t } = useI18n()
const router = useRouter()

const design = computed(() => props.design)
const isMerchantUser = computed(() => props.isMerchantUser)
const isAdminUser = computed(() => props.isAdminUser)
const canDeleteDesign = computed(() => props.canDeleteDesign)
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

const appId = computed(() => {
  const id = (design.value.product as any)?.appId
  return typeof id === 'number' && Number.isFinite(id) ? id : null
})

const operationsDrawerVisible = ref(false)
const appScoreTotal = computed(() => {
  const rawTotal = design.value.product?.score
  const total = Number(rawTotal)
  return Number.isFinite(total) ? total : null
})

const appScoreTotalText = computed(() => {
  if (appScoreTotal.value === null) return '-'
  return appScoreTotal.value.toFixed(4)
})

const goToOperations = () => {
  if (!appId.value) return
  operationsDrawerVisible.value = true
}

const showBuildPrgButton = computed(() => {
  const product = design.value.product as any
  if (!product) return false
  const hasQueue = !!product.prgPackagingLog?.rank
  const releaseUpdatedAtRaw = product.prgRelease?.updatedAt as string | number | undefined
  const designUpdatedAtRaw = design.value.updatedAt as string | number | undefined

  // 若设计本身没有更新时间，则不允许构建
  if (!designUpdatedAtRaw) return false

  const designTs = +new Date(designUpdatedAtRaw)
  // 如果没有 PRG release 更新时间，视为需要构建
  if (!releaseUpdatedAtRaw) return !hasQueue

  const releaseTs = +new Date(releaseUpdatedAtRaw)
  return !hasQueue && releaseTs < designTs
})

const showRunPrgButton = computed(() => {
  const product = design.value.product as any
  return !!product?.prgRelease?.prgUrl
})

const showBuildIqButton = computed(() => {
  const product = design.value.product as any
  if (!product) return false

  const hasQueue = !!product.packagingLog?.rank
  const designStatus = design.value.designStatus
  const productReleaseUpdatedAtRaw = (product.release as { updatedAt?: string | number } | undefined)?.updatedAt
  const designUpdatedAtRaw = design.value.updatedAt as string | number | undefined

  // 没有设计更新时间时，不允许构建 IQ
  if (!designUpdatedAtRaw) return false

  const designTs = +new Date(designUpdatedAtRaw)
  const releaseTs = productReleaseUpdatedAtRaw ? +new Date(productReleaseUpdatedAtRaw) : null

  return (
    !hasQueue &&
    (
      designStatus === 'draft' ||
      // 如果还没有 release 记录，认为需要构建；否则比较时间戳
      releaseTs === null || designTs > releaseTs
    )
  )
})

const showDownloadIqButton = computed(() => {
  return hasDownloadablePackage.value
})

const showPublishButton = computed(() => {
  const product = design.value.product
  return !!product?.release
})

const lastPackageTimeText = computed(() => {
  const updatedAt = (design.value.product as any)?.release?.updatedAt as string | number | undefined
  if (!updatedAt) return t('common.unknown')
  return dayjs(updatedAt).format('YYYY-MM-DD HH:mm')
})

const lastUpdatedText = computed(() => {
  const updatedAt = design.value.updatedAt as string | number | undefined
  if (!updatedAt) return t('common.unknown')
  return dayjs(updatedAt).format('YYYY-MM-DD HH:mm')
})

const packageStatusText = (log?: ProductPackagingLogVo) => {
  if (!log) return ''
  const rank = log.rank
  if (rank !== null && rank !== undefined) {
    return rank > 0 ? t('card.position', { rank }) : t('card.packaging')
  }
  const status = String(log.packagingStatus || '').toLowerCase()
  if (status === 'completed') return t('card.packageCompleted')
  if (status === 'failed') return t('card.packageFailed')
  if (status === 'pending' || status === 'init') return t('card.packagePending')
  return log.packagingStatus || t('common.unknown')
}

const packageTone = (log?: ProductPackagingLogVo, hasRelease = false) => {
  const status = String(log?.packagingStatus || '').toLowerCase()
  if (status === 'failed') return 'failed'
  if (log?.rank !== null && log?.rank !== undefined) return 'pending'
  if (status === 'completed' || hasRelease) return 'ready'
  return 'neutral'
}

const packageRows = computed(() => {
  const product = design.value.product
  if (!product) return []

  const rows: Array<{
    key: string
    label: string
    value: string
    tone: string
    isPackaging: boolean
    logId?: number
    canViewBuildLog: boolean
    buildLogPath?: string | null
  }> = []

  const canOpenLog = (log?: ProductPackagingLogVo) => {
    return !!(isMerchantUser.value && log?.id && log?.lastBuildLogPath && log.rank !== 0)
  }

  const prgLog = product.prgPackagingLog
  const prgReleaseUpdatedAt = product.prgRelease?.updatedAt
  if (prgLog || product.prgRelease?.prgUrl) {
    const value = packageStatusText(prgLog) || (prgReleaseUpdatedAt ? `${t('card.packageReady')} ${dayjs(prgReleaseUpdatedAt).format('MM-DD HH:mm')}` : t('card.packageReady'))
    rows.push({
      key: 'prg',
      label: 'PRG',
      value,
      tone: packageTone(prgLog, !!product.prgRelease?.prgUrl),
      isPackaging: prgLog?.rank === 0,
      logId: prgLog?.id,
      canViewBuildLog: canOpenLog(prgLog),
      buildLogPath: prgLog?.lastBuildLogPath,
    })
  }

  const iqLog = product.packagingLog
  const iqReleaseUpdatedAt = product.release?.updatedAt
  if (iqLog || product.release?.packageUrl) {
    const value = packageStatusText(iqLog) || (iqReleaseUpdatedAt ? `${t('card.packageReady')} ${dayjs(iqReleaseUpdatedAt).format('MM-DD HH:mm')}` : t('card.packageReady'))
    rows.push({
      key: 'iq',
      label: 'IQ',
      value,
      tone: packageTone(iqLog, !!product.release?.packageUrl),
      isPackaging: iqLog?.rank === 0,
      logId: iqLog?.id,
      canViewBuildLog: canOpenLog(iqLog),
      buildLogPath: iqLog?.lastBuildLogPath,
    })
  }

  return rows
})

const openBuildLog = (logId?: number) => {
  if (!logId) return
  const target = router.resolve({
    name: 'PackagingBuildLog',
    params: { id: String(logId) },
  })
  window.open(target.href, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.design-card {
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  height: 100%;
  overflow: hidden;
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
  color: var(--studio-text);
}

.design-card :deep(.el-card__body) {
  padding: 10px;
}

.design-card :deep(.el-card__header) {
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--studio-border);
}

.design-card:hover {
  transform: translateY(-2px);
  border-color: var(--studio-primary);
  box-shadow: var(--studio-shadow-md);
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
  font-size: 15px;
  font-weight: 800;
  color: var(--studio-text);
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

.app-ops-entry {
  margin-left: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.build-log-file-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
  color: var(--studio-primary);
  font-size: 14px;
  line-height: 1;
}

.build-log-file-link:hover {
  color: var(--studio-primary-hover);
}

.score-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: var(--studio-surface-soft);
  border: 1px solid var(--studio-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

:global(html[data-studio-theme='dark']) .score-pill {
  background: rgba(17, 24, 39, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

@media (prefers-color-scheme: dark) {
  .score-pill {
    background: rgba(17, 24, 39, 0.52);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
}

.score-pill.is-loading {
  opacity: 0.85;
}

.score-label {
  font-size: 11px;
  color: var(--studio-text-subtle);
}

.score-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--studio-text);
  font-variant-numeric: tabular-nums;
}

.ops-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--studio-radius-md);
  border: 1px solid var(--studio-border);
  background: var(--studio-surface);
  color: var(--studio-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

:global(html[data-studio-theme='dark']) .ops-icon-btn {
  background: rgba(17, 24, 39, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

@media (prefers-color-scheme: dark) {
  .ops-icon-btn {
    background: rgba(17, 24, 39, 0.52);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
}

.ops-icon-btn:hover {
  transform: translateY(-1px);
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  box-shadow: var(--studio-shadow-sm);
}

.ops-icon-btn :deep(svg) {
  width: 18px;
  height: 18px;
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
  gap: 10px;
  padding: 0;
}

.design-background {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  overflow: hidden;
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface-soft);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.05);
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-circle {
  position: absolute;
  inset: 0;
  background: var(--studio-surface-soft);
}

.creator-badge {
  position: absolute;
  top: 0px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: var(--color-white);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  backdrop-filter: blur(3px);
}

:global(html[data-studio-theme='dark']) .creator-badge {
  background-color: rgba(255, 255, 255, 0.2);
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
  color: var(--studio-text-subtle);
  border-top: 1px solid var(--studio-border);
  margin-top: 8px;
  padding-top: 8px;
  line-height: 1.45;
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
  background-color: var(--el-color-danger);
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

.package-info-item {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.35;
}

.package-info-item strong {
  flex: 0 0 auto;
}

.package-rank {
  min-width: 0;
  color: var(--studio-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.package-ready .package-rank {
  color: var(--el-color-success);
}

.package-pending .package-rank {
  color: var(--el-color-warning);
}

.package-failed .package-rank {
  color: var(--el-color-danger);
}

.build-log-btn {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 13px;
  color: var(--studio-primary);
  background: transparent;
  cursor: pointer;
}

.build-log-btn:hover {
  background: var(--studio-surface-soft);
}

.packaging-progress .ellipsis {
  display: inline-block;
  width: 0ch;
  overflow: hidden;
  vertical-align: baseline;
  animation: dots 1.2s steps(4, end) infinite;
}

@keyframes dots {
  0% {
    width: 0ch;
  }
  33% {
    width: 1ch;
  }
  66% {
    width: 2ch;
  }
  100% {
    width: 3ch;
  }
}

.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0;
  justify-content: center;
}

.actions .el-button {
  font-size: 11px;
  padding: 0 8px;
  margin: 0;
  flex: 0 0 auto;
  min-width: 60px;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
}

/* Actions button layout: equal width, up to 3 per row, left aligned */
.design-info .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
}

.design-info .actions .el-button {
  flex: 0 0 calc((100% - 12px) / 3);
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
  width: 30px;
  height: 30px;
  font-size: 14px;
  border-radius: var(--studio-radius-md);
}

.header-actions .el-button:hover {
  background-color: var(--studio-primary-soft);
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
