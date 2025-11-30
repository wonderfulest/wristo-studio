<template>
  <div class="icon-library">
    <div class="header">
      <h2>Icon Library</h2>
      <el-button type="primary" @click="goToIconAssets">Go to Icon Assets</el-button>
    </div>

    <div class="content-card">
      <el-tabs
        v-model="activeTab"
        type="card"
        addable
        @tab-change="onTabChange"
        @tab-add="onAddGlyph"
      >
        <el-tab-pane
          v-for="glyph in glyphs"
          :key="glyph.id"
          :name="String(glyph.id)"
        >
          <template #label>
            <span>{{ tabLabel(glyph) }}</span>
            <el-tooltip
              v-if="glyph.isDefault === 1"
              content="System Icon"
              placement="top"
            >
              <i class="icon-tag iconfont icon-system"></i>
            </el-tooltip>
            <el-tooltip
              v-if="glyph.isDefault === 0"
              content="Rename Icon Font"
              placement="top"
            >
              <el-icon class="glyph-edit-icon" @click.stop="openRenameDialog(glyph)">
                <Edit />
              </el-icon>
            </el-tooltip>
          </template>

          <GlyphAssetsPanel
            v-if="String(glyph.id) === activeTab"
            :glyph="glyph"
            :assets="assets"
            :loading="loadingAssets"
            :page="assetPage"
            :page-size="assetPageSize"
            :total="assetTotal"
            v-model:displayType="displayType"
            @edit="handleEdit"
            @openBind="(p)=> openBindDialog(p.glyphId, p.iconId)"
            @unbind="(p)=> handleUnbind(p.glyphId, p.assetId)"
            @pageChange="onAssetPageChange"
            @import="openImportDialog"
            @submitGlyph="handleSubmitGlyph"
            @displayTypeChange="onDisplayTypeChange"
          />
        </el-tab-pane>
      </el-tabs>

      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="glyphPage"
          :page-size="glyphPageSize"
          :total="glyphTotal"
          @current-change="onGlyphPageChange"
        />
      </div>
    </div>

    <CreateGlyphDialog
      v-model="createVisible"
      :loading="creating"
      :form="createForm"
      @confirm="onCreateConfirm"
    />

    <el-dialog v-model="renameVisible" title="Rename Icon Font" width="460px">
      <FontNamingBar ref="renameNamingRef" type="icon"/>
      <template #footer>
        <el-button @click="renameVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="renaming" @click="handleRenameConfirm">Save</el-button>
      </template>
    </el-dialog>

    <EditSvgDialog
      v-model="editVisible"
      :asset-id="editAssetId"
      @saved="onEditSaved"
    />
    <!-- Bind Assets Dialog -->
    <BindAssetsDialog
      v-model="bindVisible"
      :assets="bindAssets"
      :loading="bindLoading"
      :page="bindPage"
      :page-size="bindPageSize"
      :total="bindTotal"
      :keyword="bindKeyword"
      :binding="binding"
      @update:keyword="(v:string)=> bindKeyword = v"
      @search="loadBindAssets"
      @pageChange="onBindPageChange"
      @bind="handleBindSingle"
    />

    <ImportFromFontDialog
      v-model="importVisible"
      :glyphs="importableGlyphs"
      v-model:selectedId="importFromGlyphId"
      :loading="importing"
      @confirm="handleImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'
import BindAssetsDialog from './components/BindAssetsDialog.vue'
import EditSvgDialog from './components/EditSvgDialog.vue'
import GlyphAssetsPanel from './components/GlyphAssetsPanel.vue'
import CreateGlyphDialog from './components/CreateGlyphDialog.vue'
import ImportFromFontDialog from './components/ImportFromFontDialog.vue'
import FontNamingBar from '@/components/fonts/FontNamingBar.vue'
import {
  pageIconGlyphs,
  pageIconGlyphAssets,
  createIconGlyph,
  pageIconAssets,
  bindAssetsToGlyph,
  unbindAssetFromGlyph,
  importAssetsToGlyph,
  editIconGlyph,
  type IconGlyphVO,
  type IconGlyphAssetVO,
  type IconAssetVO,
  type IconGlyphCreateDTO,
  type IconAssetPageQueryDTO,
  type DisplayType,
  type IconGlyphUpdateDTO,
} from '@/api/wristo/iconGlyph'
import { autoIconFontBuild } from '@/api/wristo/fonts'

const route = useRoute()

const goToIconAssets = () => {
  window.open('/icon-assets', '_blank')
}

// glyph list (tabs)
const glyphs = ref<IconGlyphVO[]>([])
const glyphTotal = ref(0)
const glyphPage = ref(1)
const glyphPageSize = ref(10)
const activeTab = ref<string>('')
const loadingGlyphs = ref(false)

// assets for selected glyph
const assets = ref<IconGlyphAssetVO[]>([])
const assetTotal = ref(0)
const assetPage = ref(1)
const assetPageSize = ref(120)
const loadingAssets = ref(false)
const displayType = ref<DisplayType>('mip')

// rename dialog state
const renameVisible = ref(false)
const renaming = ref(false)
const renameGlyphId = ref<number | null>(null)
const renameNamingRef = ref<InstanceType<typeof FontNamingBar> | null>(null)

const ensureDisplayTypeForGlyph = (glyphId: number) => {
  const g = glyphs.value.find(x => x.id === glyphId)
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
      // isDefault: undefined,
      orderBy: 'id:asc',
    })
    const list = (data?.list ?? []) as IconGlyphVO[]
    glyphs.value = list
    glyphTotal.value = data?.total ?? 0
    // set active tab
    const qGlyphId = route.query.glyphId as string | undefined
    if (!activeTab.value) {
      activeTab.value = qGlyphId || (list[0] ? String(list[0].id) : '')
    }
    if (activeTab.value) {
      const idNum = Number(activeTab.value)
      // default to 'mip' when (re)initializing active glyph
      displayType.value = 'mip'
      ensureDisplayTypeForGlyph(idNum)
      await fetchAssets(idNum)
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
  } finally {
    loadingAssets.value = false
  }
}

const onTabChange = async (name: string) => {
  activeTab.value = name
  assetPage.value = 1
  const idNum = Number(name)
  // reset display type to 'mip' when switching glyph tab
  displayType.value = 'mip'
  ensureDisplayTypeForGlyph(idNum)
  await fetchAssets(idNum)
}

const onGlyphPageChange = async (page: number) => {
  glyphPage.value = page
  await fetchGlyphs()
}

const onAssetPageChange = async (page: number) => {
  assetPage.value = page
  await fetchAssets(Number(activeTab.value))
}

const handleUnbind = async (glyphId: number, assetId: number) => {
  if (!glyphId || !assetId) return
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to unbind this asset from the font?',
      'Unbind Asset',
      {
        type: 'warning',
        confirmButtonText: 'Unbind',
        cancelButtonText: 'Cancel',
      }
    )
  } catch {
    return
  }
  try {
    await unbindAssetFromGlyph(glyphId, assetId)
    ElMessage.success('Unbound successfully')
    if (String(glyphId) === activeTab.value) {
      await fetchAssets(glyphId)
    }
  } catch (e) {
    console.error(e)
  }
}

const onDisplayTypeChange = async (_v: DisplayType) => {
  // reset to first page when switching display type
  assetPage.value = 1
  await fetchAssets(Number(activeTab.value))
}

const tabLabel = (g: IconGlyphVO) => {
  // Keep label simple; system/default glyphs are indicated via tooltip+tag in the tab label slot
  return g.glyphCode || 'Font'
}

const openRenameDialog = async (glyph: IconGlyphVO) => {
  if (!glyph || glyph.isDefault === 1) return
  renameGlyphId.value = glyph.id
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
  if (!renameGlyphId.value) return

  const naming = renameNamingRef.value as any
  const namingPreview = naming?.namingPreview ?? ''
  if (!namingPreview) {
    ElMessage.error('Please enter a valid font name before saving.')
    return
  }

  const code = String(namingPreview)
  const parts = code.split('-').filter(Boolean)
  const last = parts[parts.length - 1] || ''

  const dto: IconGlyphUpdateDTO = {
    id: renameGlyphId.value,
    glyphCode: code,
    style: last,
  }

  try {
    renaming.value = true
    await editIconGlyph(dto)
    ElMessage.success('Icon font name updated.')
    renameVisible.value = false
    await fetchGlyphs()
  } finally {
    renaming.value = false
  }
}

const handleSubmitGlyph = async () => {
  try {
    await ElMessageBox.confirm(
      'After submitting, the system will build an icon font from the current glyph and make it available in your fonts list.',
      'Build Icon Font',
      {
        type: 'info',
        confirmButtonText: 'Build',
        cancelButtonText: 'Cancel',
      }
    )

    const glyphId = Number(activeTab.value)
    if (!glyphId) return

    const glyph = glyphs.value.find(g => g.id === glyphId)
    if (!glyph || !glyph.glyphCode) {
      ElMessage.error('Missing glyphCode for current glyph, cannot build icon font.')
      return
    }

    const { data } = await autoIconFontBuild(glyph.glyphCode)

    if (data?.ttfFile?.url) {
      const url = data.ttfFile.url
      // 自动在新标签页打开 TTF 链接，方便用户下载或预览
      window.open(url, '_blank')
      ElMessage.success('Icon font built successfully. The TTF file has been opened in a new tab.')
      // 可选：后续根据需要，触发字体列表刷新
    } else {
      ElMessage.warning('Build request sent, but no TTF file URL was returned.')
    }
  } catch {
    // user canceled or request failed silently handled elsewhere
  }
}

onMounted(async () => {
  await fetchGlyphs()
})

// 

const editVisible = ref(false)
const editAssetId = ref<number | null>(null)
const handleEdit = (item: IconGlyphAssetVO) => {
  editAssetId.value = item.asset?.id ?? null
  editVisible.value = true
}
const onEditSaved = async () => {
  await fetchAssets(Number(activeTab.value))
}

// ---------------- Create glyph ----------------
const createVisible = ref(false)
const creating = ref(false)
const createForm = ref<IconGlyphCreateDTO>({ glyphCode: '', style: '', isDefault: 0, isActive: 1 })
const onAddGlyph = () => { createVisible.value = true }
const onCreateConfirm = async (payload: IconGlyphCreateDTO) => {
  if (!payload.glyphCode) return
  try {
    creating.value = true
    const { data } = await createIconGlyph(payload)
    createVisible.value = false
    // refresh list and switch to new glyph
    await fetchGlyphs()
    if (data?.id) {
      activeTab.value = String(data.id)
      assetPage.value = 1
      await fetchAssets(Number(activeTab.value))
    }
    // reset form
    createForm.value = { glyphCode: '', style: '', isDefault: 0, isActive: 1 }
  } finally {
    creating.value = false
  }
}

// ---------------- Bind assets ----------------
const bindVisible = ref(false)
const binding = ref(false)
const bindGlyphId = ref<number | null>(null)
const bindIconId = ref<number | null>(null)
const bindKeyword = ref('')
const bindPage = ref(1)
const bindPageSize = ref(12)
const bindTotal = ref(0)
const bindAssets = ref<IconAssetVO[]>([])
const bindLoading = ref(false)

const openBindDialog = async (glyphId: number, iconId?: number) => {
  bindGlyphId.value = glyphId
  bindIconId.value = iconId ?? null
  bindVisible.value = true
  bindPage.value = 1
  await loadBindAssets()
}

const loadBindAssets = async () => {
  try {
    bindLoading.value = true
    const dto: IconAssetPageQueryDTO = {
      pageNum: bindPage.value,
      pageSize: bindPageSize.value,
      iconId: bindIconId.value ?? undefined,
      displayType: displayType.value,
      keyword: bindKeyword.value || undefined,
      orderBy: 'id:desc',
    }
    const { data } = await pageIconAssets(dto)
    bindAssets.value = data?.list ?? []
    bindTotal.value = data?.total ?? 0
  } finally {
    bindLoading.value = false
  }
}

const onBindPageChange = async (page: number) => {
  bindPage.value = page
  await loadBindAssets()
}

const handleBindSingle = async (assetId: number) => {
  if (!bindGlyphId.value || !assetId) return
  try {
    binding.value = true
    await bindAssetsToGlyph(bindGlyphId.value,  assetId)
    bindVisible.value = false
    await fetchAssets(Number(activeTab.value))
  } finally {
    binding.value = false
  }
}

// ---------------- Import from other glyph (for non-default glyphs) ----------------
const importVisible = ref(false)
const importing = ref(false)
const importTargetGlyphId = ref<number | null>(null)
const importFromGlyphId = ref<number | null>(null)
const importableGlyphs = ref<IconGlyphVO[]>([])

const openImportDialog = (g: IconGlyphVO) => {
  importTargetGlyphId.value = g.id
  // prepare candidate list: non-default glyphs excluding self
  importableGlyphs.value = glyphs.value.filter(x => x.id !== g.id)
  importFromGlyphId.value = null
  importVisible.value = true
}

const handleImport = async () => {
  if (!importFromGlyphId.value || !importTargetGlyphId.value) return
  try {
    importing.value = true
    await importAssetsToGlyph(importFromGlyphId.value, importTargetGlyphId.value)
    importVisible.value = false
    // refresh assets of target glyph (if it's the active tab)
    if (String(importTargetGlyphId.value) === activeTab.value) {
      await fetchAssets(importTargetGlyphId.value)
    }
  } finally {
    importing.value = false
  }
}

// (upload header button removed)
</script>

<style scoped>
.icon-library { padding: 16px; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.content-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0px 0 8px 0; }
.badge { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #eef2ff; color: #4f46e5; margin-right: 8px; }
.badge.custom { background: #ecfdf5; color: #059669; }
.meta { font-size: 12px; color: #606266; margin-right: 12px; }
.assets-grid { min-height: 220px; }
.loading { display: flex; gap: 8px; align-items: center; color: #909399; padding: 16px; }
.empty { color: #909399; padding: 24px 0; text-align: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 12px; padding: 8px 0; }
.grid-item { position: relative; border: 1px solid #eee; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; background: #fafafa; }
.grid-item .preview { position: relative; width: 100%; display: flex; align-items: center; justify-content: center; }
.grid-item img { width: 48px; height: 48px; object-fit: contain; transition: opacity .2s ease, filter .2s ease; pointer-events: none; }
.grid-item .overlay { position: absolute; inset: 0; border-radius: 6px; background: transparent; display: flex; align-items: stretch; justify-content: flex-end; opacity: 0; transition: opacity .2s ease; z-index: 2; }
.grid-item:hover .overlay { opacity: 1; }
.grid-item:hover .preview img { opacity: .06; filter: grayscale(100%) brightness(.6); }
.overlay-actions { width: 42%; min-width: 96px; height: 100%; display: flex; flex-direction: column; gap: 8px; align-items: stretch; justify-content: center; padding: 8px; background: rgba(0,0,0,0.88); border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
.overlay-actions .action { display: block; width: 100%; text-align: center; color: #0b2a4a; background: rgba(230,240,255,.95); cursor: pointer; font-size: 13px; font-weight: 700; text-shadow: none; padding: 6px 10px; border-radius: 6px; }
.overlay-actions .action:hover { background: #409eff; color: #fff; }
.overlay-actions .delete { color: #fff; background: rgba(245,108,108,.95); cursor: pointer; font-size: 13px; font-weight: 700; text-shadow: none; padding: 2px 8px; border-radius: 6px; }
.overlay-actions .delete:hover { background: #f44336; }
.grid-meta { font-weight: 900; font-size: 12px; color: #909399; }
.grid-meta .delete { color: #f56c6c; margin-left: 6px; cursor: pointer; font-weight: 500; }
.pager { display: flex; justify-content: center; padding: 8px 0; }
.bind-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.icon-tag {margin-left: 4px; color: #909399; font-size: 12px;}
.glyph-edit-icon { margin-left: 4px; color: #909399; font-size: 14px; cursor: pointer; }
</style>
