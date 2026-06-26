<template>
  <div class="icon-library">
    <div class="header">
      <div class="header-copy">
        <h2>{{ t('icon.libraryTitle') }}</h2>
        <p>{{ t('icon.librarySubtitle') }}</p>
      </div>
      <div class="header-actions">
        <el-button @click="goToIconAssets">{{ t('icon.goToAssets') }}</el-button>
      </div>
    </div>

    <HeaderUploadSvg
      v-if="canManageActiveGlyph"
      ref="headerUploadRef"
      class="hidden-upload"
      :show-button="false"
      :show-hint="false"
      :upload-context="{ glyphId: activeGlyphId }"
      @uploaded="onIconUploaded"
    />

    <div class="workspace-card">
      <aside class="font-set-panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">{{ t('icon.fontSets') }}</div>
            <strong>{{ glyphTotal }}</strong>
          </div>
          <el-tooltip v-if="canUsePremiumAssets" :content="t('icon.createIconFont')" placement="top">
            <el-button class="icon-only-button" type="primary" circle @click="onAddGlyph">
              <el-icon><Plus /></el-icon>
            </el-button>
          </el-tooltip>
        </div>

        <div v-if="loadingGlyphs" class="sidebar-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          {{ t('icon.loadingIcons') }}
        </div>
        <div v-else class="font-set-list">
          <button
            v-for="glyph in glyphs"
            :key="glyph.glyphCode || glyph.id"
            type="button"
            class="font-set-item"
            :class="{ active: glyph.glyphCode === activeTab }"
            @click="selectGlyph(glyph)"
          >
            <el-tooltip :content="tabLabel(glyph)" placement="top" :show-after="120">
              <span class="font-set-name">{{ tabLabel(glyph) }}</span>
            </el-tooltip>
            <span class="font-set-meta">
              <span class="badge" :class="{ custom: glyph.isDefault === 0, system: glyph.isDefault === 1 }">
                {{ glyph.isDefault === 1 ? t('icon.systemIcon') : t('icon.custom') }}
              </span>
              <span>{{ t('font.version') }} {{ glyph.version ?? '-' }}</span>
            </span>
            <el-tooltip
              v-if="glyph.isDefault === 0 && canUsePremiumAssets && !isGlyphRenameLocked(glyph)"
              :content="t('icon.renameIconFont')"
              placement="top"
            >
              <el-button
                class="rename-button"
                text
                circle
                @click.stop="openRenameDialog(glyph)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
            </el-tooltip>
          </button>
        </div>

        <div v-if="glyphTotal > glyphPageSize" class="pager glyph-pager">
          <el-pagination
            small
            background
            layout="prev, pager, next"
            :current-page="glyphPage"
            :page-size="glyphPageSize"
            :total="glyphTotal"
            @current-change="onGlyphPageChange"
          />
        </div>
      </aside>

      <main class="glyph-board">
        <div class="board-toolbar">
          <div class="board-title">
            <div class="eyebrow">{{ t('icon.glyphGrid') }}</div>
            <el-tooltip :content="activeGlyph?.glyphCode || t('icon.noFontSelected')" placement="top" :show-after="120">
              <div class="board-title-row">
                <h3>{{ activeGlyph?.glyphCode || t('icon.noFontSelected') }}</h3>
                <el-tag v-if="activeGlyph?.isDefault === 1" size="small" effect="light" type="primary">
                  {{ t('icon.systemIcon') }}
                </el-tag>
              </div>
            </el-tooltip>
          </div>
          <div class="board-actions">
            <el-button
              v-if="canManageActiveGlyph"
              type="primary"
              size="small"
              @click="handleUploadToActiveGlyph"
            >
              <el-icon><Upload /></el-icon>
              {{ t('icon.uploadAsset') }}
            </el-button>
            <el-button
              v-if="activeGlyph"
              size="small"
              :loading="downloadingSvgSources"
              @click="handleDownloadSvgSources"
            >
              <el-icon><Download /></el-icon>
              {{ t('icon.downloadSvgSources') }}
            </el-button>
            <el-radio-group
              v-model="displayType"
              class="display-switch"
              size="small"
              @change="onDisplayTypeChange"
            >
              <el-radio-button label="mip">MIP</el-radio-button>
              <el-radio-button label="amoled">AMOLED</el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <div v-if="downloadingSvgSources" class="download-progress">
          <div class="download-progress-head">
            <span>{{ downloadSvgProgressLabel }}</span>
            <strong>{{ downloadSvgProgress }}%</strong>
          </div>
          <el-progress
            :percentage="downloadSvgProgress"
            :show-text="false"
            :stroke-width="8"
          />
        </div>

        <div class="board-summary">
          <div class="summary-item">
            <span class="summary-label">{{ t('icon.currentAssets') }}</span>
            <strong>{{ assetTotal }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('icon.mappedOnPage') }}</span>
            <strong>{{ mappedAssetCount }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('icon.missingOnPage') }}</span>
            <strong>{{ missingAssetCount }}</strong>
          </div>
          <div v-if="activeGlyph" class="summary-item build-status-compact" :class="`build-status-compact--${buildStatusTone}`">
            <div class="build-status-head">
              <span class="summary-label">{{ t('icon.buildTaskStatus') }}</span>
              <el-tag size="small" effect="light" :type="buildStatusTagType">
                {{ buildStatusShortLabel }}
              </el-tag>
            </div>
            <div class="build-status-meta-row">
              <span v-if="iconFontBuildStatus?.taskId" class="build-status-meta">
                {{ t('icon.buildTaskId') }} {{ iconFontBuildStatus.taskId }}
              </span>
              <span v-if="buildStatusTime" class="build-status-meta">
                {{ buildStatusTime }}
              </span>
              <span v-if="iconFontBuildStatus?.error" class="build-error">{{ iconFontBuildStatus.error }}</span>
            </div>
            <div class="build-status-actions">
              <el-button size="small" text :loading="buildStatusLoading" @click="refreshBuildStatus">
                {{ t('common.refresh') }}
              </el-button>
              <el-button
                v-if="canDownloadBuildFont"
                size="small"
                text
                type="primary"
                @click="openBuildFontUrl"
              >
                {{ t('common.download') }}
              </el-button>
            </div>
          </div>
        </div>

        <div class="assets-grid">
          <div v-if="loadingAssets" class="loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            {{ t('icon.loadingIcons') }}
          </div>
          <template v-else>
            <div v-if="assets.length === 0" class="empty-state">
              <div class="empty-title">{{ t('icon.noIcons') }}</div>
              <div class="empty-desc">{{ t('icon.noIconsHint') }}</div>
            </div>
            <div v-else class="grid">
              <div
                v-for="item in assets"
                :key="item.id"
                role="button"
                tabindex="0"
                class="grid-item"
                :class="{ selected: selectedAssetId === item.id, missing: !getAssetImage(item) }"
                @click="selectAsset(item)"
                @keydown.enter.prevent="selectAsset(item)"
                @keydown.space.prevent="selectAsset(item)"
              >
                <div class="grid-topline">
                  <el-tooltip :content="item.icon?.symbolCode || '-'" placement="top" :show-after="120">
                    <span class="symbol-code">{{ item.icon?.symbolCode || '-' }}</span>
                  </el-tooltip>
                  <span class="display-pill">{{ displayTypeShortLabel(displayType) }}</span>
                </div>
                <div class="preview">
                  <img v-if="getAssetImage(item)" :src="getAssetImage(item)" alt="icon" />
                  <div v-else-if="canUploadForIconAsset(item)" class="missing-asset">
                    <button
                      class="missing-upload-button"
                      type="button"
                      :aria-label="t('icon.uploadAsset')"
                      :title="t('icon.uploadAsset')"
                      @click.stop="handleUploadForIcon({ iconUnicode: item.icon?.iconUnicode, displayType })"
                    >
                      <el-icon><Plus /></el-icon>
                    </button>
                  </div>
                  <div v-else class="missing-asset">
                    <el-icon class="missing-icon"><Plus /></el-icon>
                    <span>{{ t('icon.assetMissingShort') }}</span>
                  </div>
                </div>
                <div class="grid-meta">
                  <span>{{ item.icon?.iconUnicode || '-' }}</span>
                </div>
                <div v-if="canManageActiveGlyph" class="quick-actions" @click.stop>
                  <el-tooltip
                    v-if="activeGlyph?.isDefault === 0 && displayType === 'mip' && item.asset?.id"
                    :content="t('common.edit')"
                    placement="top"
                  >
                    <button type="button" class="icon-action" @click="handleEdit(item)">
                      <el-icon><Edit /></el-icon>
                    </button>
                  </el-tooltip>
                </div>
              </div>
            </div>

            <div v-if="assetTotal > assetPageSize" class="pager asset-pager">
              <div class="pager-context">
                <span>{{ t('icon.currentAssets') }}</span>
                <strong>{{ assetTotal }}</strong>
              </div>
              <el-pagination
                background
                layout="prev, pager, next"
                :current-page="assetPage"
                :page-size="assetPageSize"
                :total="assetTotal"
                @current-change="onAssetPageChange"
              />
            </div>

            <div v-if="activeGlyph && canManageActiveGlyph" class="board-footer-actions">
              <el-button
                type="primary"
                :loading="buildSubmitting"
                :disabled="isBuildRunning"
                @click="handleSubmitGlyph"
              >
                {{ t('icon.submitFont') }}
              </el-button>
            </div>
          </template>
        </div>
      </main>

    </div>

    <CreateGlyphDialog
      v-model="createVisible"
      :loading="creating"
      :form="createForm"
      @confirm="onCreateConfirm"
    />

    <el-dialog
      v-model="renameVisible"
      :title="t('icon.renameIconFont')"
      width="min(680px, calc(100vw - 32px))"
      class="icon-font-dialog"
    >
      <FontNamingBar ref="renameNamingRef" type="icon"/>
      <template #footer>
        <el-button @click="renameVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="renaming" @click="handleRenameConfirm">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <EditSvgDialog
      v-model="editVisible"
      :asset-id="editAssetId"
      @saved="onEditSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Edit, Loading, Plus, Upload } from '@element-plus/icons-vue'
import JSZip from 'jszip'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import EditSvgDialog from './components/EditSvgDialog.vue'
import CreateGlyphDialog from './components/CreateGlyphDialog.vue'
import HeaderUploadSvg from './components/HeaderUploadSvg.vue'
import FontNamingBar from '@/components/fonts/FontNamingBar.vue'
import { useI18n } from '@/i18n'
import {
  pageIconGlyphs,
  pageIconGlyphAssets,
  createIconGlyph,
  editIconGlyph,
  submitIconGlyph,
  bindAssetsToGlyph,
  type IconGlyphVO,
  type IconGlyphAssetVO,
  type IconAssetVO,
  type IconGlyphCreateDTO,
  type DisplayType,
  type IconGlyphUpdateDTO,
} from '@/api/wristo/iconGlyph'
import { autoIconFontBuild, getIconFontBuildStatus } from '@/api/wristo/fonts'
import type { IconFontBuildStatusVO } from '@/types/font'

const route = useRoute()
const { t } = useI18n()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)
const isAdminUser = computed(() => userStore.isAdminUser)

const requireIconPremium = () => membershipGate.requirePremium('icon.premiumRequired')
const canManageGlyph = (glyph?: IconGlyphVO | null) => {
  if (!glyph) return false
  return glyph.isDefault === 1 ? isAdminUser.value : canUsePremiumAssets.value
}
const canManageActiveGlyph = computed(() => canManageGlyph(activeGlyph.value))

const requireManageActiveGlyph = () => {
  const glyph = activeGlyph.value
  if (!glyph) return false
  if (glyph.isDefault === 1 && !isAdminUser.value) {
    ElMessage.warning(t('icon.systemIconAdminOnly'))
    return false
  }
  if (!canUsePremiumAssets.value) {
    requireIconPremium()
    return false
  }
  return true
}

const goToIconAssets = () => {
  window.open('/icon-assets', '_blank')
}

// glyph list (tabs)
const glyphs = ref<IconGlyphVO[]>([])
const glyphTotal = ref(0)
const glyphPage = ref(1)
const glyphPageSize = ref(10)
const activeTab = ref<string>('') // stores glyphCode of active glyph
const loadingGlyphs = ref(false)
const activeGlyphId = computed(() => glyphs.value.find(x => x.glyphCode === activeTab.value)?.id)

// assets for selected glyph
const assets = ref<IconGlyphAssetVO[]>([])
const assetTotal = ref(0)
const assetPage = ref(1)
const assetPageSize = ref(120)
const loadingAssets = ref(false)
const displayType = ref<DisplayType>('mip')
const headerUploadRef = ref<InstanceType<typeof HeaderUploadSvg> | null>(null)
const selectedAssetId = ref<number | null>(null)
const activeGlyph = computed(() => glyphs.value.find(x => x.glyphCode === activeTab.value) ?? null)
const mappedAssetCount = computed(() => assets.value.filter(item => !!getAssetImage(item)).length)
const missingAssetCount = computed(() => Math.max(0, assets.value.length - mappedAssetCount.value))
const iconFontBuildStatus = ref<IconFontBuildStatusVO | null>(null)
const buildStatusLoading = ref(false)
const buildSubmitting = ref(false)
const downloadingSvgSources = ref(false)
const downloadSvgProgress = ref(0)
const downloadSvgProcessed = ref(0)
const downloadSvgTotal = ref(0)
const downloadSvgProgressStage = ref<'preparing' | 'downloading' | 'packaging'>('preparing')
let buildStatusTimer: number | null = null

const buildFontUrl = computed(() => iconFontBuildStatus.value?.font?.ttfFile?.url || '')
const normalizedBuildStatus = computed(() => String(iconFontBuildStatus.value?.status || 'idle').toLowerCase())
const canDownloadBuildFont = computed(() => normalizedBuildStatus.value === 'success' && !!buildFontUrl.value)
const buildStatusShortLabel = computed(() => t(`icon.buildStatus.${normalizedBuildStatus.value}`))
const buildStatusTime = computed(() => iconFontBuildStatus.value?.updatedAt || iconFontBuildStatus.value?.startedAt || iconFontBuildStatus.value?.createdAt || '')
const buildStatusTone = computed(() => {
  if (normalizedBuildStatus.value === 'failed') return 'failed'
  if (normalizedBuildStatus.value === 'success') return 'success'
  if (normalizedBuildStatus.value === 'pending' || normalizedBuildStatus.value === 'running') return 'running'
  return 'idle'
})
const buildStatusTagType = computed(() => {
  if (normalizedBuildStatus.value === 'failed') return 'danger'
  if (normalizedBuildStatus.value === 'success') return 'success'
  if (normalizedBuildStatus.value === 'pending' || normalizedBuildStatus.value === 'running') return 'warning'
  return 'info'
})
const isBuildRunning = computed(() => normalizedBuildStatus.value === 'running')
const glyphBuildStatuses = ref<Record<string, IconFontBuildStatusVO | null>>({})
const downloadSvgProgressLabel = computed(() => {
  if (downloadSvgProgressStage.value === 'packaging') return t('icon.downloadSvgPackaging')
  if (downloadSvgProgressStage.value === 'downloading') {
    return t('icon.downloadSvgProgress', {
      current: downloadSvgProcessed.value,
      total: downloadSvgTotal.value,
    })
  }
  return t('icon.downloadSvgPreparing')
})

// rename dialog state
const renameVisible = ref(false)
const renaming = ref(false)
const renameGlyphId = ref<number | null>(null)
const renameOriginalGlyphCode = ref('')
const renameNamingRef = ref<InstanceType<typeof FontNamingBar> | null>(null)

const ensureDisplayTypeForGlyph = (glyphCode: string) => {
  const g = glyphs.value.find(x => x.glyphCode === glyphCode)
  if (!g) return
  if (g.isDefault === 1 && displayType.value !== 'mip') {
    displayType.value = 'mip'
  }
}

const fetchGlyphs = async () => {
  try {
    loadingGlyphs.value = true
    const { data } = await pageIconGlyphs({
      pageNum: glyphPage.value,
      pageSize: glyphPageSize.value,
      // active: 1,
      isDefault: canUsePremiumAssets.value ? undefined : 1,
      orderBy: 'id:asc',
    })
    const rawList = (data?.list ?? []) as IconGlyphVO[]
    const list = canUsePremiumAssets.value ? rawList : rawList.filter(g => g.isDefault === 1)
    console.log('glyphs list', list)
    glyphs.value = list
    glyphTotal.value = data?.total ?? list.length
    // set active tab
    const qGlyphCode = route.query.glyphCode as string | undefined
    const qGlyphId = route.query.glyphId as string | undefined
    if (!activeTab.value) {
      if (qGlyphCode) {
        activeTab.value = qGlyphCode
      } else if (qGlyphId) {
        const found = list.find(g => String(g.id) === qGlyphId)
        activeTab.value = found?.glyphCode || (list[0]?.glyphCode || '')
      } else {
        activeTab.value = list[0]?.glyphCode || ''
      }
    }
    if (activeTab.value) {
      const g = list.find(x => x.glyphCode === activeTab.value)
      if (g) {
        // default to 'mip' when (re)initializing active glyph
        displayType.value = 'mip'
        ensureDisplayTypeForGlyph(g.glyphCode)
        await fetchAssets(g.id)
        await loadBuildStatus(g.glyphCode, true)
      }
    }
  } finally {
    loadingGlyphs.value = false
  }
}

const fetchAssets = async (glyphId: number) => {
  if (!glyphId) return
  try {
    loadingAssets.value = true
    const { data } = await pageIconGlyphAssets({
      pageNum: assetPage.value,
      pageSize: assetPage.value ? assetPageSize.value : assetPageSize.value,
      glyphId,
      active: 1,
      displayType: displayType.value,
      orderBy: 'id:asc',
    } as any)
    assets.value = data?.list ?? []
    assetTotal.value = data?.total ?? 0
    selectedAssetId.value = null
  } finally {
    loadingAssets.value = false
  }
}

const fetchAllGlyphAssets = async (glyphId: number) => {
  const pageSize = 500
  let pageNum = 1
  let total = 0
  const list: IconGlyphAssetVO[] = []

  do {
    const { data } = await pageIconGlyphAssets({
      pageNum,
      pageSize,
      glyphId,
      active: 1,
      orderBy: 'id:asc',
    } as any)
    const pageList = data?.list ?? []
    list.push(...pageList)
    total = data?.total ?? list.length
    pageNum += 1
  } while (list.length < total)

  return list
}

const selectGlyph = async (glyph: IconGlyphVO) => {
  if (!glyph?.glyphCode || glyph.glyphCode === activeTab.value) return
  await onTabChange(glyph.glyphCode)
}

const selectAsset = (item: IconGlyphAssetVO) => {
  selectedAssetId.value = item.id
}

const onTabChange = async (name: string) => {
  activeTab.value = name // name is glyphCode
  assetPage.value = 1
  selectedAssetId.value = null
  const g = glyphs.value.find(x => x.glyphCode === name)
  if (!g) return
  // reset display type to 'mip' when switching glyph tab
  displayType.value = 'mip'
  ensureDisplayTypeForGlyph(g.glyphCode)
  await fetchAssets(g.id)
  await loadBuildStatus(g.glyphCode, true)
}

const onGlyphPageChange = async (page: number) => {
  glyphPage.value = page
  await fetchGlyphs()
}

const onAssetPageChange = async (page: number) => {
  assetPage.value = page
  const g = glyphs.value.find(x => x.glyphCode === activeTab.value)
  if (!g) return
  await fetchGlyphs()
}

const clearBuildStatusPolling = () => {
  if (buildStatusTimer) {
    window.clearInterval(buildStatusTimer)
    buildStatusTimer = null
  }
}

const scheduleBuildStatusPolling = () => {
  clearBuildStatusPolling()
  if (normalizedBuildStatus.value !== 'pending' && normalizedBuildStatus.value !== 'running') return
  if (!activeTab.value) return
  buildStatusTimer = window.setInterval(() => {
    void loadBuildStatus(activeTab.value, true)
  }, 5000)
}

const loadBuildStatus = async (glyphCode: string, silent = false) => {
  if (!glyphCode) return
  try {
    if (!silent) buildStatusLoading.value = true
    const { data } = await getIconFontBuildStatus(glyphCode)
    iconFontBuildStatus.value = data ?? { glyphCode, status: 'idle' }
    scheduleBuildStatusPolling()
  } catch (e) {
    if (!silent) throw e
  } finally {
    if (!silent) buildStatusLoading.value = false
  }
}

const refreshBuildStatus = async () => {
  if (!activeTab.value) return
  await loadBuildStatus(activeTab.value)
}

const hasGeneratedTtf = (status?: IconFontBuildStatusVO | null) => {
  return !!status?.font?.ttfFile?.url || !!status?.font?.ttf
}

const isGlyphRenameLocked = (glyph?: IconGlyphVO | null) => {
  if (!glyph?.glyphCode) return false
  if (glyph.glyphCode === activeTab.value && hasGeneratedTtf(iconFontBuildStatus.value)) {
    return true
  }
  return hasGeneratedTtf(glyphBuildStatuses.value[glyph.glyphCode])
}

const loadGlyphBuildStatusForRename = async (glyphCode: string) => {
  const { data } = await getIconFontBuildStatus(glyphCode)
  glyphBuildStatuses.value[glyphCode] = data ?? null
  if (glyphCode === activeTab.value) {
    iconFontBuildStatus.value = data ?? { glyphCode, status: 'idle' }
    scheduleBuildStatusPolling()
  }
  return data ?? null
}

const openBuildFontUrl = () => {
  if (!canDownloadBuildFont.value) return
  window.open(buildFontUrl.value, '_blank')
}

const onDisplayTypeChange = async (_v: DisplayType | string | number | boolean | undefined) => {
  // reset to first page when switching display type
  assetPage.value = 1
  selectedAssetId.value = null
  const g = glyphs.value.find(x => x.glyphCode === activeTab.value)
  if (!g) return
  await fetchAssets(g.id)
}

const tabLabel = (g: IconGlyphVO) => {
  // Keep label simple; system/default glyphs are indicated via tooltip+tag in the tab label slot
  return g.glyphCode || t('font.nameLabel')
}

const openRenameDialog = async (glyph: IconGlyphVO) => {
  if (!canUsePremiumAssets.value) {
    requireIconPremium()
    return
  }
  if (!glyph || glyph.isDefault === 1) return
  const status = await loadGlyphBuildStatusForRename(glyph.glyphCode)
  if (hasGeneratedTtf(status)) {
    ElMessage.warning(t('icon.renameLockedAfterTtf'))
    return
  }
  renameGlyphId.value = glyph.id
  renameOriginalGlyphCode.value = glyph.glyphCode || ''
  renameVisible.value = true

  await nextTick()
  const naming = renameNamingRef.value as any
  if (!naming) return

  const code = glyph.glyphCode || ''
  const parts = code.split('-').filter(Boolean)
  const [series, use, style, variant] = parts

  if (series != null) naming.seriesPart.value = series
  if (use != null) naming.usePart.value = use
  if (style != null) naming.stylePart.value = style
  if (variant != null) naming.variantPart.value = variant
}

const handleRenameConfirm = async () => {
  if (!canUsePremiumAssets.value) {
    requireIconPremium()
    return
  }
  if (!renameGlyphId.value) return

  const naming = renameNamingRef.value as any
  naming?.normalizeAllParts?.()
  const namingPayload = naming?.getNamingPayload?.()
  const code = String(namingPayload?.name || '')
  if (!code) {
    ElMessage.error(t('font.enterValidName'))
    return
  }
  if (renameOriginalGlyphCode.value && code !== renameOriginalGlyphCode.value) {
    const status = await loadGlyphBuildStatusForRename(renameOriginalGlyphCode.value)
    if (hasGeneratedTtf(status)) {
      ElMessage.warning(t('icon.renameLockedAfterTtf'))
      renameVisible.value = false
      return
    }
  }

  const dto: IconGlyphUpdateDTO = {
    id: renameGlyphId.value,
    glyphCode: code,
    style: namingPayload?.variant || namingPayload?.style || '',
  }

  try {
    renaming.value = true
    await editIconGlyph(dto)
    ElMessage.success(t('icon.nameUpdated'))
    renameVisible.value = false
    await fetchGlyphs()
  } finally {
    renaming.value = false
  }
}

const handleSubmitGlyph = async () => {
  const glyph = glyphs.value.find(g => g.glyphCode === activeTab.value)
  if (!requireManageActiveGlyph()) return
  if (!glyph || !glyph.glyphCode) {
    ElMessage.error(t('icon.missingGlyphCode'))
    return
  }
  try {
    await ElMessageBox.confirm(
      t('icon.buildFontBody'),
      t('icon.buildFontTitle'),
      {
        type: 'info',
        confirmButtonText: t('icon.build'),
        cancelButtonText: t('common.cancel'),
      }
    )

    buildSubmitting.value = true
    await submitIconGlyph(glyph.id)
    const { data } = await autoIconFontBuild(glyph.glyphCode)
    iconFontBuildStatus.value = data ?? { glyphCode: glyph.glyphCode, status: 'pending' }
    scheduleBuildStatusPolling()
    await ElMessageBox.alert(
      t('icon.buildSubmittedBody'),
      t('icon.buildSubmittedTitle'),
      {
        type: 'success',
        confirmButtonText: t('common.ok'),
      }
    )
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(t('icon.buildSubmitFailed'))
    }
  } finally {
    buildSubmitting.value = false
  }
}

onMounted(async () => {
  await fetchGlyphs()
})

onUnmounted(() => {
  clearBuildStatusPolling()
})

// 

const editVisible = ref(false)
const editAssetId = ref<number | null>(null)
const handleEdit = (item: IconGlyphAssetVO) => {
  if (!requireManageActiveGlyph()) return
  editAssetId.value = item.asset?.id ?? null
  editVisible.value = true
}
const onEditSaved = async () => {
  const g = glyphs.value.find(x => x.glyphCode === activeTab.value)
  if (!g) return
  await fetchAssets(g.id)
}

const getRequestErrorMessage = (error: unknown): string => {
  const e = error as any
  return e?.response?.data?.msg
    || e?.response?.data?.message
    || e?.msg
    || e?.message
    || t('common.saveFailed')
}

const onIconUploaded = async (payload?: { asset?: IconAssetVO; assets?: IconAssetVO[]; context?: { glyphId?: number } }) => {
  const g = glyphs.value.find(x => x.glyphCode === activeTab.value)
  if (!g) return
  const glyphId = payload?.context?.glyphId || g.id
  const uploadedAssets = payload?.assets?.length ? payload.assets : (payload?.asset ? [payload.asset] : [])
  for (const asset of uploadedAssets) {
    if (!asset?.id) continue
    try {
      await bindAssetsToGlyph(glyphId, asset.id)
    } catch (e) {
      ElMessage.error(getRequestErrorMessage(e))
    }
  }
  await fetchAssets(g.id)
  if (g.glyphCode) {
    await loadBuildStatus(g.glyphCode, true)
  }
}

const handleUploadForIcon = (payload: { iconUnicode?: string; displayType: DisplayType }) => {
  if (!requireManageActiveGlyph()) return
  const g = glyphs.value.find(x => x.glyphCode === activeTab.value)
  headerUploadRef.value?.openUpload(payload.iconUnicode, payload.displayType, { glyphId: g?.id })
}

const handleUploadToActiveGlyph = () => {
  if (!requireManageActiveGlyph()) return
  const g = glyphs.value.find(x => x.glyphCode === activeTab.value)
  if (!g) return
  headerUploadRef.value?.openUpload(undefined, displayType.value, { glyphId: g.id })
}

const sanitizeDownloadName = (name: string, fallback = 'icon-font') => {
  return String(name || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback
}

const isSvgUrl = (url: string) => {
  return /\.svg(?:[?#].*)?$/i.test(url)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const getAssetSvgSource = (item: IconGlyphAssetVO) => {
  const asset = item.asset
  if (!asset) return ''
  if (asset.svgContent) return asset.svgContent
  const url = asset.svgFile || ''
  if (url) return toAbsUrl(url)
  const fallbackUrl = asset.previewUrl || asset.imageUrl || ''
  return fallbackUrl && isSvgUrl(fallbackUrl) ? toAbsUrl(fallbackUrl) : ''
}

const buildSvgFileName = (item: IconGlyphAssetVO, usedNames: Set<string>) => {
  const icon = item.icon
  const asset = item.asset
  const displayFolder = sanitizeDownloadName(asset?.displayType || 'unknown', 'unknown')
  const baseName = sanitizeDownloadName(
    icon?.symbolCode || icon?.iconUnicode || `asset-${item.assetId || item.id}`,
    `asset-${item.assetId || item.id}`,
  )
  let fileName = `${displayFolder}/${baseName}.svg`
  if (usedNames.has(fileName)) {
    fileName = `${displayFolder}/${baseName}-${item.assetId || item.id}.svg`
  }
  usedNames.add(fileName)
  return fileName
}

const handleDownloadSvgSources = async () => {
  const glyph = activeGlyph.value
  if (!glyph?.id || downloadingSvgSources.value) return

  downloadingSvgSources.value = true
  downloadSvgProgress.value = 0
  downloadSvgProcessed.value = 0
  downloadSvgTotal.value = 0
  downloadSvgProgressStage.value = 'preparing'
  try {
    const relations = await fetchAllGlyphAssets(glyph.id)
    const downloadableRelations = relations.filter(relation => !!getAssetSvgSource(relation))
    downloadSvgTotal.value = downloadableRelations.length
    const zip = new JSZip()
    const usedNames = new Set<string>()
    let fileCount = 0

    if (!downloadableRelations.length) {
      ElMessage.warning(t('icon.noSvgSourcesToDownload'))
      return
    }

    downloadSvgProgressStage.value = 'downloading'
    downloadSvgProgress.value = 1

    for (const relation of downloadableRelations) {
      const source = getAssetSvgSource(relation)
      const fileName = buildSvgFileName(relation, usedNames)
      if (source.trim().startsWith('<svg') || source.trim().startsWith('<?xml')) {
        zip.file(fileName, source)
      } else {
        const response = await fetch(source)
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG source: ${source}`)
        }
        zip.file(fileName, await response.blob())
      }
      fileCount += 1
      downloadSvgProcessed.value = fileCount
      downloadSvgProgress.value = Math.min(95, Math.max(1, Math.round((fileCount / downloadableRelations.length) * 95)))
    }

    downloadSvgProgressStage.value = 'packaging'
    downloadSvgProgress.value = Math.max(downloadSvgProgress.value, 96)
    const blob = await zip.generateAsync(
      { type: 'blob' },
      metadata => {
        downloadSvgProgress.value = Math.min(99, 96 + Math.round((metadata.percent || 0) * 0.03))
      },
    )
    downloadBlob(blob, `${sanitizeDownloadName(glyph.glyphCode, 'icon-font')}-svg-sources.zip`)
    downloadSvgProgress.value = 100
  } catch (e) {
    console.warn('download icon SVG sources failed', e)
    ElMessage.error(t('icon.downloadSvgSourcesFailed'))
  } finally {
    window.setTimeout(() => {
      downloadingSvgSources.value = false
      downloadSvgProgress.value = 0
      downloadSvgProcessed.value = 0
      downloadSvgTotal.value = 0
      downloadSvgProgressStage.value = 'preparing'
    }, 500)
  }
}

// ---------------- Create glyph ----------------
const createVisible = ref(false)
const creating = ref(false)
const createForm = ref<IconGlyphCreateDTO>({ glyphCode: '', style: '', isDefault: 0, isActive: 1 })
const onAddGlyph = () => {
  if (!canUsePremiumAssets.value) {
    requireIconPremium()
    return
  }
  createVisible.value = true
}
const onCreateConfirm = async (payload: IconGlyphCreateDTO) => {
  if (!canUsePremiumAssets.value) {
    requireIconPremium()
    return
  }
  if (!payload.glyphCode) return
  try {
    creating.value = true
    const { data } = await createIconGlyph(payload)
    createVisible.value = false
    // refresh list and switch to new glyph
    await fetchGlyphs()
    if (data?.id) {
      activeTab.value = data.glyphCode
      assetPage.value = 1
      await fetchAssets(data.id)
    }
    // reset form
    createForm.value = { glyphCode: '', style: '', isDefault: 0, isActive: 1 }
  } finally {
    creating.value = false
  }
}

const displayTypeShortLabel = (value?: DisplayType) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'amoled') return 'A'
  if (normalized === 'mip') return 'M'
  return value || '-'
}

const toAbsUrl = (url: string) => {
  if (!url) return ''
  return /^(https?:|data:|blob:)/i.test(url) ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}

const getAssetImage = (item: IconGlyphAssetVO): string => {
  const raw = item?.asset?.svgFile || item?.asset?.previewUrl || item?.asset?.imageUrl || ''
  return raw ? toAbsUrl(raw) : ''
}

const canUploadForIconAsset = (item: IconGlyphAssetVO) => {
  return canManageActiveGlyph.value && !!item.icon?.iconUnicode && !getAssetImage(item)
}

</script>

<style scoped>
.icon-library { padding: 14px 18px 18px; color: var(--studio-text); }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 10px; }
.header-copy { min-width: 0; }
.header h2 { margin: 0; font-size: 21px; line-height: 1.18; color: var(--studio-text); }
.header p { margin: 3px 0 0; max-width: 760px; color: var(--studio-text-muted); font-size: 13px; line-height: 1.35; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.hidden-upload {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: auto;
}

.workspace-card {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}
.font-set-panel,
.glyph-board {
  min-width: 0;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  box-shadow: var(--studio-shadow-sm);
}
.font-set-panel { padding: 12px; }
.glyph-board { padding: 14px; }
.panel-head,
.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  flex-wrap: wrap;
}
.panel-head strong {
  display: block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--studio-text);
}
.eyebrow {
  color: var(--studio-text-subtle);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}
.icon-only-button { width: 32px; height: 32px; min-width: 32px; padding: 0; }
.sidebar-loading,
.loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: var(--studio-text-subtle);
}

.font-set-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.font-set-item {
  position: relative;
  width: 100%;
  min-height: 68px;
  padding: 10px 40px 10px 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface-soft);
  color: var(--studio-text);
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
}
.font-set-item:hover,
.font-set-item.active {
  border-color: var(--studio-primary-border);
  background: var(--studio-primary-soft);
}
.font-set-item.active { box-shadow: inset 3px 0 0 var(--studio-primary); }
.font-set-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
}
.font-set-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  color: var(--studio-text-muted);
  font-size: 12px;
}
.badge {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-size: 11px;
  font-weight: 700;
}
.badge.custom { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.rename-button { position: absolute; top: 8px; right: 8px; }

.board-title { min-width: 0; }
.board-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.board-title h3 {
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  line-height: 1.3;
}
.display-switch { flex: none; }
.download-progress {
  margin: 8px 0 12px;
  padding: 8px 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface-soft);
}
.download-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  color: var(--studio-text-muted);
  font-size: 12px;
}
.download-progress-head strong {
  color: var(--studio-text);
  font-variant-numeric: tabular-nums;
}
.build-status-compact {
  border-left-width: 3px;
  overflow: hidden;
}
.build-status-compact--idle { border-left-color: var(--studio-border); }
.build-status-compact--running { border-left-color: var(--el-color-warning); }
.build-status-compact--success { border-left-color: var(--el-color-success); }
.build-status-compact--failed { border-left-color: var(--el-color-danger); }
.build-status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}
.build-status-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}
.build-status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 20px;
}
.build-status-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--studio-text-muted);
  font-size: 12px;
}
.build-error {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-color-danger);
  font-size: 12px;
}
.board-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: none;
}
.board-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0;
}
.summary-item {
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface-soft);
}
.summary-label { color: var(--studio-text-subtle); font-size: 12px; }
.summary-item strong {
  color: var(--studio-text);
  font-size: 20px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.assets-grid { min-height: 320px; }
.empty-state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  border: 1px dashed var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface-soft);
  color: var(--studio-text-subtle);
  text-align: center;
}
.empty-title { color: var(--studio-text); font-weight: 800; }
.empty-desc { max-width: 420px; color: var(--studio-text-muted); font-size: 13px; line-height: 1.5; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 8px;
}
.grid-item {
  position: relative;
  min-height: 132px;
  padding: 7px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-sm);
  background: var(--studio-surface-soft);
  color: var(--studio-text);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.grid-item:hover,
.grid-item.selected {
  border-color: var(--studio-primary-border);
  box-shadow: var(--studio-shadow-sm);
  transform: translateY(-1px);
}
.grid-item.selected { box-shadow: inset 0 0 0 2px var(--studio-primary-border); }
.grid-item.missing { border-style: dashed; }
.grid-topline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  padding-right: 28px;
}
.symbol-code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  font-weight: 800;
}
.display-pill {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-size: 10px;
  font-weight: 800;
  text-align: center;
}
.preview {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px 0;
}
.preview img,
.preview img {
  width: 70px;
  height: 70px;
  object-fit: contain;
  pointer-events: none;
}
.missing-asset {
  width: 100%;
  height: 100%;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed var(--studio-border);
  border-radius: var(--studio-radius-sm);
  color: var(--studio-text-muted);
  font-size: 12px;
}
.missing-asset.large { min-height: 132px; }
.missing-icon { color: var(--studio-primary); font-size: 18px; }
.missing-upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  min-width: 34px;
  padding: 0;
  border: 1px solid var(--studio-primary-border);
  border-radius: 50%;
  background: transparent;
  color: var(--studio-primary);
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}
.missing-upload-button :deep(.el-icon) { font-size: 18px; }
.missing-upload-button:hover {
  background: var(--studio-primary-soft);
  transform: translateY(-1px);
}
.missing-upload-button:active { transform: translateY(0); }
.grid-meta {
  min-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--studio-text-subtle);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  text-align: center;
}
.quick-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  margin-top: 4px;
}
.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  min-width: 22px;
  padding: 0;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  background: transparent;
  color: var(--studio-primary);
  box-shadow: none;
  font-size: 13px;
  opacity: 0.72;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, opacity 160ms ease, transform 160ms ease;
}
.icon-action :deep(.el-icon) { font-size: 13px; }
.icon-action:hover {
  border-color: var(--studio-primary-border);
  opacity: 1;
  transform: translateY(-1px);
}
.icon-action:active {
  transform: translateY(0);
}

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 0 4px; }
.asset-pager { justify-content: flex-end; }
.glyph-pager { margin-top: 10px; border-top: 1px solid var(--studio-border); }
.board-footer-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--studio-border);
}
.pager-context {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  background: var(--studio-surface-soft);
  color: var(--studio-text-muted);
  font-size: 12px;
}
.pager-context strong { color: var(--studio-text); font-size: 13px; font-variant-numeric: tabular-nums; }

@media (max-width: 1180px) {
  .workspace-card { grid-template-columns: minmax(200px, 240px) minmax(0, 1fr); }
  .board-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 820px) {
  .icon-library { padding: 14px; }
  .header { flex-direction: column; align-items: stretch; }
  .header-actions { justify-content: flex-start; }
  .workspace-card { grid-template-columns: 1fr; }
  .board-toolbar { align-items: stretch; flex-direction: column; }
  .board-actions { justify-content: space-between; }
  .board-summary { grid-template-columns: 1fr; }
}
</style>
