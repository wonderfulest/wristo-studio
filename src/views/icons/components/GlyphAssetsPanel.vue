<template>
    <el-tabs v-model="innerTab">
      <el-tab-pane
        v-for="opt in visibleOptions"
        :key="opt.value"
        :label="opt.name || opt.value"
        :name="opt.value"
      >
        <div class="tab-toolbar">
          <div class="info">
            <span class="badge" :class="{ custom: glyph.isDefault === 0 }">{{ glyph.isDefault === 1 ? 'Default' : 'Custom' }}</span>
            <span class="meta">Style: {{ glyph.style || '-' }}</span>
            <span class="meta">Version: {{ glyph.version ?? '-' }}</span>
          </div>
          <div class="actions" v-if="glyph.isDefault === 0">
            <el-button size="small" @click="emit('import', glyph)">Import From Font</el-button>
            <el-button type="primary" size="small" @click="emit('submitGlyph')">Submit Font</el-button>
          </div>
        </div>

        <div class="assets-grid">
          <div v-if="loading" class="loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            Loading icons...
          </div>
          <template v-else>
            <div v-if="assets.length === 0" class="empty">
              No icons
              <el-button type="primary" text @click="emit('openBind', { glyphId: glyph.id })">Bind Assets</el-button>
            </div>
            <div v-else class="grid">
              <div v-for="item in assets" :key="item.id" class="grid-item">
                <template v-if="getAssetImage(item)">
                  <div class="overlay overlay-actions">
                    <span v-if="glyph.isDefault === 0 && displayType === 'mip'" class="action" @click="emit('edit', item)">Edit</span>
                    <span
                      v-if="glyph.isDefault === 0"
                      class="action"
                      @click="emit('openBind', { glyphId: glyph.id, iconId: item.icon?.id ?? undefined })"
                    >Rebind</span>
                    <span
                      v-if="glyph.isDefault === 0 && displayType === 'amoled'"
                      class="action delete"
                      @click="() => {
                        const assetId = item.asset?.id 
                        if (!assetId) {
                          console.warn('[GlyphAssetsPanel] Missing assetId for unbind', item)
                          return
                        }
                        emit('unbind', { glyphId: glyph.id, assetId })
                      }"
                    >Unbind</span>
                  </div>
                  <div class="preview">
                    <img :src="getAssetImage(item)" alt="icon" />
                  </div>
                </template>
                <template v-else>
                  <el-button type="primary" circle plain @click="emit('openBind', { glyphId: glyph.id, iconId: item.icon?.id ?? undefined })">
                    <el-icon><Plus /></el-icon>
                  </el-button>
                </template>
                <div class="grid-meta meta-codes">
                  <!-- <div class="symbol-code">{{ item.icon?.symbolCode }}</div> -->
                  <div class="symbol-unicode">{{ item.icon?.iconUnicode }}</div>
                </div>
              </div>
            </div>
            <div class="pager">
              <el-pagination
                background
                layout="prev, pager, next"
                :current-page="page"
                :page-size="pageSize"
                :total="total"
                @current-change="(p:number)=> emit('pageChange', p)"
              />
            </div>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Loading, Plus } from '@element-plus/icons-vue'
import type { IconGlyphVO, IconGlyphAssetVO, DisplayType } from '@/api/wristo/iconGlyph'
import { getEnumOptions } from '@/api/common'
import type { EnumOption } from '@/api/common'

const props = defineProps<{
  glyph: IconGlyphVO
  assets: IconGlyphAssetVO[]
  loading: boolean
  page: number
  pageSize: number
  total: number
  displayType?: DisplayType
}>()

const emit = defineEmits<{
  (e: 'edit', item: IconGlyphAssetVO): void
  (e: 'openBind', payload: { glyphId: number; iconId?: number }): void
  (e: 'unbind', payload: { glyphId: number; assetId: number }): void
  (e: 'pageChange', page: number): void
  (e: 'import', glyph: IconGlyphVO): void
  (e: 'submitGlyph'): void
  (e: 'update:displayType', value: DisplayType): void
  (e: 'displayTypeChange', value: DisplayType): void
}>()

const innerTab = ref<DisplayType>('mip')
const options = ref<EnumOption[]>([])
const defaultOptions: EnumOption[] = [
  { name: 'mip', value: 'mip' },
  { name: 'amoled', value: 'amoled' },
]

// Only show 'mip' for default fonts
const visibleOptions = computed<EnumOption[]>(() => {
  const list = options.value
  if (props.glyph?.isDefault === 1) {
    return list.filter(o => String(o.value).toLowerCase() === 'mip')
  }
  return list
})
onMounted(async () => {
  try {
    const res: any = await getEnumOptions('DisplayType')
    const list: EnumOption[] = res?.data ?? res ?? []
    options.value = (Array.isArray(list) && list.length) ? list : defaultOptions
  } catch {
    options.value = defaultOptions
  }
  // ensure innerTab is valid
  const values = new Set(options.value.map(o => o.value))
  if (!values.has(innerTab.value)) {
    innerTab.value = (options.value[0]?.value as DisplayType) || 'mip'
  }
})
// sync from parent
watch((): DisplayType | undefined => props.displayType, (v: DisplayType | undefined) => {
  if (v && v !== innerTab.value) innerTab.value = v
}, { immediate: true })
// enforce 'mip' for default glyphs and keep innerTab valid for custom
watch(
  () => [props.glyph?.isDefault, options.value.map(o => o.value).join(',')],
  () => {
    if (props.glyph?.isDefault === 1) {
      if (innerTab.value !== 'mip') innerTab.value = 'mip'
    } else {
      const values = new Set(visibleOptions.value.map(o => o.value))
      if (!values.has(innerTab.value)) {
        innerTab.value = (visibleOptions.value[0]?.value as DisplayType) || 'mip'
      }
    }
  },
  { immediate: true }
)
// emit to parent on change
watch(innerTab, (v: DisplayType) => {
  emit('update:displayType', v)
  emit('displayTypeChange', v)
})

const toAbsUrl = (url: string) => {
  if (!url) return ''
  return /^(https?:|data:|blob:)/i.test(url) ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}

const getAssetImage = (item: IconGlyphAssetVO): string => {
  const raw = item?.asset?.previewUrl || item?.asset?.imageUrl || ''
  return raw ? toAbsUrl(raw) : ''
}
</script>

<style scoped>
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
.overlay-actions .action.delete { background: rgba(245,108,108,.96); color: #fff; }
.overlay-actions .action.delete:hover { background: #f44336; color: #fff; }
.grid-meta { font-weight: 900; font-size: 12px; color: #909399; }
.meta-codes { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.symbol-code { font-weight: 700; color: #303133; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space: normal; word-break: break-all; text-align: center; max-width: 100%; }
.symbol-unicode { font-size: 12px; color: #909399; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.pager { display: flex; justify-content: center; padding: 8px 0; }
</style>

<style>
.el-tabs__header { margin-bottom: 8px; }
</style>
