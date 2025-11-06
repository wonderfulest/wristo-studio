<template>
  <div class="icon-library">
    <div class="header">
      <h2>Icon Library</h2>
      <HeaderUploadSvg @uploaded="onHeaderUploaded" />
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
          :label="tabLabel(glyph)"
          :name="String(glyph.id)"
        >
          <div class="tab-toolbar">
            <div class="info">
              <span class="badge" :class="{ custom: glyph.isDefault === 0 }">{{ glyph.isDefault === 1 ? 'Default' : 'Custom' }}</span>
              <span class="meta">Style: {{ glyph.style || '-' }}</span>
              <span class="meta">Version: {{ glyph.version ?? '-' }}</span>
            </div>
            <div class="actions" v-if="glyph.isDefault === 0">
              <el-button size="small" @click="openImportDialog(glyph)">Import From Font</el-button>
              <el-button type="primary" size="small" @click="handleSubmitGlyph()">Submit Font</el-button>
            </div>
          </div>

          <div class="assets-grid">
            <div v-if="loadingAssets" class="loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              Loading icons...
            </div>
            <template v-else>
              <div v-if="assets.length === 0" class="empty">
                No icons
                <el-button type="primary" text @click="openBindDialog(Number(activeTab))">Bind Assets</el-button>
              </div>
              <div v-else class="grid">
                <div v-for="item in assets" :key="item.id" class="grid-item">
                  <template v-if="getAssetImage(item)">
                    <div class="overlay overlay-actions">
                      <span v-if="glyph.isDefault === 0" class="action" @click="handleEdit(item)">Edit</span>
                      <span v-if="glyph.isDefault === 0" class="action" @click="openBindDialog(Number(activeTab), item.icon?.id)">Rebind</span>
                    </div>
                    <div class="preview">
                      <img :src="getAssetImage(item)" alt="icon" />
                    </div>
                  </template>
                  <template v-else>
                    <el-button type="primary" circle plain @click="openBindDialog(Number(activeTab), item.icon?.id)">
                      <el-icon><Plus /></el-icon>
                    </el-button>
                  </template>
                  <div class="grid-meta">
                    {{ item.icon?.iconUnicode }}
                  </div>
                </div>
              </div>
              <div class="pager">
                <el-pagination
                  background
                  layout="prev, pager, next"
                  :current-page="assetPage"
                  :page-size="assetPageSize"
                  :total="assetTotal"
                  @current-change="onAssetPageChange"
                />
              </div>
            </template>
          </div>
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

    <!-- Create Glyph Dialog -->
    <el-dialog v-model="createVisible" title="Create Icon Font" width="460px">
      <el-form :model="createForm" label-width="96px">
        <el-form-item label="Glyph Code">
          <el-input v-model="createForm.glyphCode" placeholder="e.g. my-icons" />
        </el-form-item>
        <el-form-item label="Style">
          <el-input v-model="createForm.style" placeholder="e.g. Regular" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">Cancel</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateGlyph">Create</el-button>
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
      :selected-ids="bindSelected"
      @update:keyword="(v:string)=> bindKeyword = v"
      @search="loadBindAssets"
      @pageChange="onBindPageChange"
      @selectionChange="(ids:number[])=> bindSelected = ids"
      @confirm="handleBind"
      @bind="handleBindSingle"
    />

    <!-- Import From Font Dialog -->
    <el-dialog v-model="importVisible" title="Import Assets From Font" width="460px">
      <el-form label-width="96px">
        <el-form-item label="From Font">
          <el-select v-model="importFromGlyphId" placeholder="Select a font" filterable style="width: 100%">
            <el-option
              v-for="g in importableGlyphs"
              :key="g.id"
              :label="tabLabel(g)"
              :value="g.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importVisible=false">Cancel</el-button>
        <el-button type="primary" :disabled="!importFromGlyphId" :loading="importing" @click="handleImport">Import</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BindAssetsDialog from './components/BindAssetsDialog.vue'
import HeaderUploadSvg from './components/HeaderUploadSvg.vue'
import EditSvgDialog from './components/EditSvgDialog.vue'
import {
  pageIconGlyphs,
  pageIconGlyphAssets,
  createIconGlyph,
  pageIconAssets,
  bindAssetsToGlyph,
  importAssetsToGlyph,
  submitIconGlyph,
  type IconGlyphVO,
  type IconGlyphAssetVO,
  type IconAssetVO,
  type IconGlyphCreateDTO,
  type IconAssetPageQueryDTO,
} from '@/api/wristo/iconGlyph'

const route = useRoute()

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
      await fetchAssets(Number(activeTab.value))
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
      pageSize: assetPageSize.value,
      glyphId,
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
  await fetchAssets(Number(name))
}

const onGlyphPageChange = async (page: number) => {
  glyphPage.value = page
  await fetchGlyphs()
}

const onAssetPageChange = async (page: number) => {
  assetPage.value = page
  await fetchAssets(Number(activeTab.value))
}

const tabLabel = (g: IconGlyphVO) => {
  const tag = g.isDefault === 1 ? 'Default' : 'Custom'
  return `${g.glyphCode || 'Font'} · ${tag}`
}

const handleSubmitGlyph = async () => {
  try {
    await ElMessageBox.confirm(
      'After submitting, the system will process your font within 1 business day. You will receive a system notification when processing is complete, and the icons will automatically appear in your icon list.',
      'Submit Font',
      {
        type: 'info',
        confirmButtonText: 'Submit',
        cancelButtonText: 'Cancel',
      }
    )
    const glyphId = Number(activeTab.value)
    if (!glyphId) return
    await submitIconGlyph(glyphId)
    ElMessage.success('Submitted. We will process it within 1 business day and notify you.')
    // Optionally refresh current glyph data
    await fetchGlyphs()
  } catch {
    // user canceled
  }
}

onMounted(async () => {
  await fetchGlyphs()
})

// Convert relative to absolute URL
const toAbsUrl = (url: string) => {
  if (!url) return ''
  return /^(https?:|data:|blob:)/i.test(url) ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}

// Resolve asset image preview source (prefer previewUrl > imageUrl)
const getAssetImage = (item: IconGlyphAssetVO): string => {
  const raw = item?.asset?.previewUrl || item?.asset?.imageUrl || ''
  return raw ? toAbsUrl(raw) : ''
}

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
const handleCreateGlyph = async () => {
  if (!createForm.value.glyphCode) return
  try {
    creating.value = true
    const { data } = await createIconGlyph(createForm.value)
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
const bindSelected = ref<number[]>([])

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

// selection and preview are handled in BindAssetsDialog

const handleBind = async () => {
  if (!bindGlyphId.value || bindSelected.value.length === 0) return
  try {
    binding.value = true
    await bindAssetsToGlyph(bindGlyphId.value, bindSelected.value)
    bindVisible.value = false
    // refresh assets of the active glyph
    await fetchAssets(Number(activeTab.value))
  } finally {
    binding.value = false
  }
}

const handleBindSingle = async (assetId: number) => {
  if (!bindGlyphId.value || !assetId) return
  try {
    binding.value = true
    await bindAssetsToGlyph(bindGlyphId.value, [assetId])
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

const onHeaderUploaded = async () => {
  // If bind dialog is open, refresh the list so newly uploaded assets appear
  if (bindVisible.value) {
    await loadBindAssets()
  }
}
</script>

<style scoped>
.icon-library { padding: 16px; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.content-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
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
</style>
