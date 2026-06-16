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
            <span class="badge" :class="{ custom: glyph.isDefault === 0 }">{{ glyph.isDefault === 1 ? t('icon.default') : t('icon.custom') }}</span>
            <span class="meta">{{ t('icon.style') }}: {{ glyph.style || '-' }}</span>
            <span class="meta">{{ t('font.version') }} {{ glyph.version ?? '-' }}</span>
          </div>
          <div class="actions" v-if="glyph.isDefault === 0"> 
            <el-button size="small" @click="emit('import', glyph)">{{ t('icon.importFromFont') }}</el-button>
            <el-button type="primary" size="small" @click="emit('submitGlyph')">{{ t('icon.submitFont') }}</el-button>
          </div>
        </div>

        <div class="assets-grid">
          <div v-if="loading" class="loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            {{ t('icon.loadingIcons') }}
          </div>
          <template v-else>
            <div v-if="displayAssets.length === 0" class="empty-state">
              <div class="empty-title">{{ t('icon.noIcons') }}</div>
              <div class="empty-desc">{{ t('icon.noIconsHint') }}</div>
              <el-button v-if="canManage" type="primary" @click="emit('openBind', { glyphId: glyph.id })">{{ t('icon.bindAssets') }}</el-button>
            </div>
            <div v-else class="grid">
              <div v-for="item in displayAssets" :key="item.id" class="grid-item">
                <div class="grid-topline">
                  <span class="symbol-code">{{ item.icon?.symbolCode || '-' }}</span>
                  <span class="display-pill" :title="displayType || innerTab">
                    {{ displayTypeShortLabel(displayType || innerTab) }}
                  </span>
                </div>
                <template v-if="getAssetImage(item)">
                  <div v-if="canManage" class="overlay overlay-actions">
                    <span v-if="glyph.isDefault === 0 && displayType === 'mip'" class="action" @click="emit('edit', item)">{{ t('common.edit') }}</span>
                    <span
                      class="action"
                      @click="emit('uploadForIcon', {
                        iconUnicode: item.icon?.iconUnicode,
                        displayType: displayType || innerTab,
                      })"
                    >{{ t('icon.uploadForThisIcon') }}</span>
                    <span
                      class="action"
                      @click="emit('openBind', {
                        glyphId: glyph.id,
                        iconId: item.icon?.id ?? undefined,
                        iconUnicode: item.icon?.iconUnicode,
                      })"
                    >{{ t('icon.rebind') }}</span>
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
                    >{{ t('icon.unbind') }}</span>
                  </div>
                  <div class="preview">
                    <img :src="getAssetImage(item)" alt="icon" />
                  </div>
                </template>
                <template v-else>
                  <div class="missing-card">
                    <div class="missing-asset">
                      <el-icon class="missing-icon"><Plus /></el-icon>
                      <span class="missing-label">{{ t('icon.assetMissingShort') }}</span>
                    </div>
                    <div v-if="canManage" class="missing-actions">
                      <el-tooltip :content="t('icon.uploadForThisIcon')" placement="top">
                        <el-button
                          class="icon-action"
                          type="primary"
                          circle
                          plain
                          :aria-label="t('icon.uploadForThisIcon')"
                          @click="emit('uploadForIcon', {
                            iconUnicode: item.icon?.iconUnicode,
                            displayType: displayType || innerTab,
                          })"
                        >
                          <el-icon><Upload /></el-icon>
                        </el-button>
                      </el-tooltip>
                      <el-tooltip :content="t('icon.bindAssets')" placement="top">
                        <el-button
                          class="icon-action"
                          circle
                          plain
                          :aria-label="t('icon.bindAssets')"
                          @click="emit('openBind', {
                            glyphId: glyph.id,
                            iconId: item.icon?.id ?? undefined,
                            iconUnicode: item.icon?.iconUnicode,
                          })"
                        >
                          <el-icon><Link /></el-icon>
                        </el-button>
                      </el-tooltip>
                    </div>
                  </div>
                </template>
                <div class="grid-meta meta-codes">
                  <div class="symbol-unicode">{{ item.icon?.iconUnicode }}</div>
                </div>
              </div>
            </div>
            <div v-if="total > pageSize" class="pager asset-pager">
              <div class="pager-context">
                <span>{{ t('icon.currentAssets') }}</span>
                <strong>{{ total }}</strong>
              </div>
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
import { Link, Loading, Plus, Upload } from '@element-plus/icons-vue'
import type { IconGlyphVO, IconGlyphAssetVO, DisplayType } from '@/api/wristo/iconGlyph'
import { getEnumOptions } from '@/api/common'
import type { EnumOption } from '@/api/common'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  glyph: IconGlyphVO
  assets: IconGlyphAssetVO[]
  loading: boolean
  page: number
  pageSize: number
  total: number
  displayType?: DisplayType
  canManage?: boolean
}>()

const canManage = computed(() => props.canManage === true)

const emit = defineEmits<{
  (e: 'edit', item: IconGlyphAssetVO): void
  (e: 'openBind', payload: { glyphId: number; iconId?: number; iconUnicode?: string }): void
  (e: 'uploadForIcon', payload: { iconUnicode?: string; displayType: DisplayType }): void
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
  // if (props.glyph?.isDefault === 1) {
  //   return list.filter(o => String(o.value).toLowerCase() === 'mip')
  // }
  return list
})

const displayAssets = computed<IconGlyphAssetVO[]>(() => props.assets)

const displayTypeShortLabel = (value?: DisplayType) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'amoled') return 'A'
  if (normalized === 'mip') return 'M'
  return value || '-'
}

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
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0 12px; }
.info { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.badge { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: var(--studio-primary-soft); color: var(--studio-primary); margin-right: 8px; }
.badge.custom { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.meta { font-size: 12px; color: var(--studio-text-muted); margin-right: 0; }
.assets-grid { min-height: 220px; }
.loading { display: flex; gap: 8px; align-items: center; color: var(--studio-text-subtle); padding: 16px; }
.empty-state { display: flex; min-height: 260px; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--studio-text-subtle); text-align: center; border: 1px dashed var(--studio-border); border-radius: var(--studio-radius-md); background: var(--studio-surface-soft); }
.empty-title { color: var(--studio-text); font-weight: 700; }
.empty-desc { max-width: 420px; font-size: 13px; line-height: 1.5; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px; padding: 8px 0; }
.grid-item { position: relative; min-height: 148px; border: 1px solid var(--studio-border); border-radius: var(--studio-radius-md); padding: 8px 10px; display: flex; flex-direction: column; align-items: stretch; gap: 8px; background: var(--studio-surface-soft); transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; overflow: hidden; }
.grid-item:hover { border-color: var(--studio-primary-border); box-shadow: var(--studio-shadow-sm); transform: translateY(-1px); }
.grid-topline { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 22px; }
.display-pill { flex: none; max-width: 58px; padding: 2px 6px; border-radius: 999px; background: var(--studio-primary-soft); color: var(--studio-primary); font-size: 10px; line-height: 1.4; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.grid-item .preview { position: relative; width: 100%; display: flex; align-items: center; justify-content: center; }
.grid-item img { width: 56px; height: 56px; object-fit: contain; transition: opacity .2s ease, filter .2s ease; pointer-events: none; }
.grid-item .overlay { position: absolute; inset: 0; border-radius: var(--studio-radius-md); background: transparent; display: flex; align-items: stretch; justify-content: flex-end; opacity: 0; transition: opacity .2s ease; z-index: 2; }
.grid-item:hover .overlay { opacity: 1; }
.grid-item:hover .preview img { opacity: .06; filter: grayscale(100%) brightness(.6); }
.overlay-actions { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; padding: 12px; background: rgba(12, 17, 32, 0.88); backdrop-filter: blur(2px); }
.overlay-actions .action { display: block; width: 100%; text-align: center; color: var(--studio-primary); background: var(--studio-primary-soft); cursor: pointer; font-size: 13px; font-weight: 700; text-shadow: none; padding: 6px 10px; border-radius: 6px; }
.overlay-actions .action:hover { background: var(--studio-primary); color: var(--color-white); }
.overlay-actions .action.delete { background: var(--el-color-danger); color: var(--color-white); }
.overlay-actions .action.delete:hover { background: var(--el-color-danger); color: var(--color-white); }
.missing-card { flex: 1; display: flex; min-height: 82px; flex-direction: column; gap: 8px; }
.missing-asset { flex: 1; min-height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--studio-text-subtle); border: 1px dashed var(--studio-border); border-radius: var(--studio-radius-sm); background: var(--studio-surface); font-size: 12px; }
.missing-icon { font-size: 18px; color: var(--studio-primary); opacity: .72; }
.missing-label { max-width: 100%; padding: 0 6px; color: var(--studio-text-muted); font-size: 11px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.missing-actions { display: flex; align-items: center; gap: 8px; justify-content: center; min-height: 36px; }
.icon-action { width: 36px; height: 36px; min-width: 36px; padding: 0; }
.icon-action + .icon-action { margin-left: 0; }
.grid-meta { font-weight: 900; font-size: 12px; color: var(--studio-text-subtle); }
.meta-codes { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.symbol-code { min-width: 0; font-weight: 700; color: var(--studio-text); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.symbol-unicode { font-size: 11px; color: var(--studio-text-subtle); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.pager { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 12px 0 4px; }
.asset-pager { margin-top: 4px; }
.pager-context { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px; border-radius: 999px; background: var(--studio-surface); border: 1px solid var(--studio-border); color: var(--studio-text-muted); font-size: 12px; }
.pager-context strong { color: var(--studio-text); font-size: 13px; font-variant-numeric: tabular-nums; }
</style>

<style>
.el-tabs__header { margin-bottom: 8px; }
</style>
