<template>
  <div class="icon-assets-container">
    <div class="header">
      <h2>{{ t('icon.assetsTitle') }}</h2>
      <div class="tools">
        <el-select v-model="active" :placeholder="t('common.status')" clearable style="width: 140px" @change="handleSearch">
          <el-option :label="t('icon.statusAll')" :value="undefined" />
          <el-option :label="t('icon.statusEnabled')" :value="1" />
          <el-option :label="t('icon.statusDisabled')" :value="0" />
        </el-select>
        <el-select v-model="iconUnicode" filterable clearable :placeholder="t('icon.selectByIcon')" style="width: 260px" @change="handleSearch">
          <el-option v-for="opt in iconOptions" :key="opt.id" :label="`${opt.symbolCode} — ${opt.iconUnicode}`" :value="opt.iconUnicode" />
        </el-select>
        <el-select v-model="sortOrder" :placeholder="t('common.sort')" style="width: 200px" @change="handleSearch">
          <el-option :label="t('icon.sortIdDesc')" value="id:desc" />
          <el-option :label="t('icon.sortIdAsc')" value="id:asc" />
        </el-select>
        <HeaderUploadSvg
          v-if="canUsePremiumAssets"
          v-model:iconUnicode="iconUnicode"
          @uploaded="handleUploaded"
        />
        <el-button type="primary" @click="handleSearch">{{ t('common.search') }}</el-button>
        <el-button @click="fetchPage">{{ t('common.refresh') }}</el-button>
      </div>
    </div>

    <div class="asset-grid" v-loading="loading">
      <div class="asset-card" v-for="row in assets" :key="row.id">
        <div class="thumb">
          <el-image
            v-if="getAssetUrl(row)"
            :src="getPreviewUrl(getAssetUrl(row))"
            fit="contain"
            class="thumb-img"
          />
          <div v-else class="thumb-empty">-</div>
        </div>
        <div class="meta">
          <div class="sub">{{ iconLabelMap[row.iconId] || '-' }}</div>
        </div>
        <div class="overlay">
          <el-button size="small" text type="primary" @click="openUrl(getAssetUrl(row))" :disabled="!getAssetUrl(row)">{{ t('icon.openAsset') }}</el-button>
          <el-button v-if="canUsePremiumAssets" size="small" text type="primary" @click="openEdit(row)">{{ t('icon.editSvg') }}</el-button>
        </div>
      </div>
      <div v-if="!loading && assets.length === 0" class="empty">{{ t('icon.noAssets') }}</div>
    </div>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <EditSvgDialog v-model="editVisible" :asset-id="editingId" @saved="onEdited" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import HeaderUploadSvg from './components/HeaderUploadSvg.vue'
import EditSvgDialog from './components/EditSvgDialog.vue'
import { pageIconAssets, listIconLibrary, type IconAssetVO, type IconLibraryVO } from '@/api/wristo/iconGlyph'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)

const assets = ref<IconAssetVO[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(100)
const total = ref(0)

const iconOptions = ref<Pick<IconLibraryVO, 'id' | 'iconUnicode' | 'symbolCode' | 'label'>[]>([])
const iconLabelMap = computed<Record<number, string>>(() => {
  const map: Record<number, string> = {}
  iconOptions.value.forEach(it => { map[it.id] = it.label || `${it.symbolCode} — ${it.iconUnicode}` })
  return map
})
const iconUnicode = ref<string | undefined>(undefined)
const selectedIconId = computed<number | undefined>(() => {
  const u = iconUnicode.value
  if (!u) return undefined
  const found = iconOptions.value.find(it => it.iconUnicode === u)
  return found?.id
})

const active = ref<number | undefined>(undefined)
const sortOrder = ref('id:desc')
const editVisible = ref(false)
const editingId = ref<number | null>(null)

const fetchPage = async () => {
  loading.value = true
  const query = {
    pageNum: currentPage.value,
    pageSize: pageSize.value,
    iconId: selectedIconId.value,
    iconUnicode: iconUnicode.value,
    displayType: 'mip',
    active: active.value,
    orderBy: sortOrder.value,
  }
  console.log('[icon-assets-page] fetch page', query)
  try {
    const { data } = await pageIconAssets(query as any)
    assets.value = (data?.list ?? []) as IconAssetVO[]
    total.value = data?.total ?? 0
    console.log('[icon-assets-page] fetch result', {
      total: total.value,
      count: assets.value.length,
      rows: assets.value.map((row) => ({
        id: row.id,
        iconId: row.iconId,
        displayType: row.displayType,
        format: row.format,
        svgFile: row.svgFile,
        previewUrl: row.previewUrl,
        imageUrl: row.imageUrl,
        resolvedUrl: getAssetUrl(row),
      })),
    })
  } catch (e) {
    console.error('[icon-assets-page] fetch failed', { query, error: e })
    ElMessage.error(t('icon.loadAssetsFailed'))
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchPage()
}
const handleSizeChange = (val: number) => {
  pageSize.value = val
  fetchPage()
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchPage()
}

const handleUploaded = (payload?: { asset?: IconAssetVO; assets?: IconAssetVO[] }) => {
  console.log('[icon-assets-page] uploaded event', {
    asset: payload?.asset,
    count: payload?.assets?.length ?? 0,
    assets: payload?.assets,
  })
  currentPage.value = 1
  if ((payload?.assets?.length ?? 0) > 1) {
    iconUnicode.value = undefined
  }
  fetchPage()
}

const openUrl = (url?: string) => {
  if (!url) return
  window.open(url, '_blank')
}

const toAbsUrl = (url: string) => {
  if (!url) return ''
  return /^(https?:|data:|blob:)/i.test(url) ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}

const getPreviewUrl = (url?: string) => {
  if (!url) return ''
  return toAbsUrl(url)
}

const getAssetUrl = (row: IconAssetVO) => {
  const url = row.svgFile || row.previewUrl || row.imageUrl || ''
  if (!url) {
    console.warn('[icon-assets-page] empty asset url', {
      id: row.id,
      iconId: row.iconId,
      displayType: row.displayType,
      format: row.format,
      svgFile: row.svgFile,
      previewUrl: row.previewUrl,
      imageUrl: row.imageUrl,
    })
  }
  return url
}

onMounted(async () => {
  try {
    const resp = await listIconLibrary()
    iconOptions.value = (resp?.data ?? []).map((it: any) => ({ id: it.id, iconUnicode: it.iconUnicode, symbolCode: it.symbolCode, label: it.label }))
  } catch {
    // silent
  }
  fetchPage()
})

// auto refresh when icon selection changes programmatically (from HeaderUploadSvg)
watch(iconUnicode, () => {
  handleSearch()
})

const openEdit = (row: IconAssetVO) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  editingId.value = row.id
  editVisible.value = true
}

const onEdited = () => {
  editVisible.value = false
  fetchPage()
}
</script>

<style scoped>
.icon-assets-container { padding: 20px; color: var(--studio-text); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tools { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.ops { display: flex; gap: 8px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }

/* Grid */
.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 24px;
  padding: 8px 0;
}

.asset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  padding: 16px 12px;
  transition: box-shadow .2s ease, transform .2s ease;
}

.asset-card:hover {
  box-shadow: var(--studio-shadow-md);
  transform: translateY(-2px);
}

.thumb {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.thumb-img {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: var(--studio-canvas-shell);
  border: 1px solid var(--studio-border);
  box-shadow: inset 0 0 0 1px var(--studio-border);
}

.thumb-empty {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--studio-surface-soft);
  color: var(--studio-text-subtle);
  border-radius: 8px;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(17, 21, 42, 0.68);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* right side */
  justify-content: flex-start; /* from top to bottom */
  gap: 8px;
  padding: 12px;
  box-sizing: border-box;
  opacity: 0;
  transition: opacity .2s ease;
  z-index: 3;
  pointer-events: none;
}

.overlay .el-button { width: auto; }

.asset-card:hover .overlay { opacity: 1; pointer-events: auto; }

/* Edge highlight + blink on hover */
.asset-card:hover .thumb-img,
.thumb:hover .thumb-img {
  animation: edge-blink 1s linear infinite;
  box-shadow: 0 0 0 2px var(--studio-primary-border), 0 0 12px rgba(15, 107, 104, 0.28);
}

@keyframes edge-blink {
  0%, 100% {
    box-shadow: 0 0 0 2px var(--studio-primary-border), 0 0 8px rgba(15, 107, 104, 0.22);
  }
  50% {
    box-shadow: 0 0 0 2px var(--studio-primary), 0 0 16px rgba(15, 107, 104, 0.42);
  }
}

.meta { text-align: center; width: 100%; }
.name { font-size: 14px; color: var(--studio-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 12px; color: var(--studio-text-subtle); margin-top: 4px; }

/* editor styles in EditSvgDialog */
.empty { color: var(--studio-text-subtle); padding: 24px 0; text-align: center; }
</style>
