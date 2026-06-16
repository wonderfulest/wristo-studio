<template>
  <el-dialog v-model="visible" :title="t('icon.bindAssetsToGlyph')" width="920px" class="bind-assets-dialog">
    <div class="bind-toolbar">
      <div class="left">
        <el-input
          :model-value="keyword"
          :placeholder="t('icon.searchAssets')"
          clearable
          @clear="$emit('search')"
          @update:model-value="$emit('update:keyword', $event)"
          @keyup.enter="$emit('search')"
          style="max-width: 320px"
        />
        <el-button :loading="loading" @click="$emit('search')">{{ t('common.search') }}</el-button>
      </div>
      <div class="toolbar-meta">
        {{ t('icon.bindAssetCount', { count: total }) }}
      </div>
    </div>
    <div v-loading="loading" class="bind-grid-wrap">
      <div v-if="!loading && assets.length === 0" class="empty-state">
        <div class="empty-title">{{ t('icon.noAssets') }}</div>
        <div class="empty-desc">{{ t('icon.noBindAssetsHint') }}</div>
      </div>
      <div v-else class="bind-grid">
        <button
          v-for="row in assets"
          :key="row.id"
          class="asset-choice"
          type="button"
          :disabled="binding"
          @click="$emit('bind', row.id)"
        >
          <span class="choice-preview">
            <img v-if="getAssetPreview(row)" :src="getAssetPreview(row)" alt="preview" />
            <span v-else class="choice-empty">-</span>
          </span>
          <span class="choice-main">
            <span class="choice-id">#{{ row.id }}</span>
            <span class="choice-format">{{ row.format || '-' }}</span>
          </span>
          <span class="choice-foot">
            <span class="display-pill">{{ row.displayType || '-' }}</span>
            <span class="choice-author">{{ row.author || '-' }}</span>
          </span>
        </button>
      </div>
    </div>
    <div class="pager">
      <el-pagination
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="$emit('pageChange', $event)"
      />
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IconAssetVO } from '@/api/wristo/iconGlyph'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  assets: IconAssetVO[]
  loading: boolean
  page: number
  pageSize: number
  total: number
  keyword: string
  binding: boolean
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'update:keyword', v: string): void
  (e: 'pageChange', page: number): void
  (e: 'search'): void
  (e: 'bind', id: number): void
  (e: 'uploaded'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const toAbsUrl = (url: string) => {
  if (!url) return ''
  return /^(https?:|data:|blob:)/i.test(url) ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}
const getAssetPreview = (row: IconAssetVO) => {
  const raw = row.previewUrl || row.imageUrl || ''
  return raw ? toAbsUrl(raw) : ''
}
</script>

<style scoped>
.bind-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.bind-toolbar .left { display: flex; align-items: center; gap: 8px; }
.toolbar-meta { flex: none; color: var(--studio-text-subtle); font-size: 13px; }
.bind-grid-wrap { min-height: 420px; }
.bind-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px; }
.asset-choice { min-height: 156px; display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 10px; border: 1px solid var(--studio-border); border-radius: var(--studio-radius-md); background: var(--studio-surface-soft); color: var(--studio-text); cursor: pointer; text-align: left; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.asset-choice:hover:not(:disabled) { border-color: var(--studio-primary-border); box-shadow: var(--studio-shadow-sm); transform: translateY(-1px); }
.asset-choice:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 2px; }
.asset-choice:disabled { cursor: progress; opacity: .72; }
.choice-preview { height: 72px; display: flex; align-items: center; justify-content: center; border-radius: var(--studio-radius-sm); background: var(--studio-surface); border: 1px solid var(--studio-border); }
.choice-preview img { width: 56px; height: 56px; object-fit: contain; }
.choice-empty { color: var(--studio-text-subtle); }
.choice-main,
.choice-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.choice-id { font-weight: 700; color: var(--studio-text); font-variant-numeric: tabular-nums; }
.choice-format,
.choice-author { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--studio-text-subtle); font-size: 12px; }
.display-pill { flex: none; padding: 2px 6px; border-radius: 999px; background: var(--studio-primary-soft); color: var(--studio-primary); font-size: 11px; line-height: 1.4; text-transform: uppercase; }
.empty-state { min-height: 420px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px dashed var(--studio-border); border-radius: var(--studio-radius-md); background: var(--studio-surface-soft); text-align: center; color: var(--studio-text-subtle); }
.empty-title { font-weight: 700; color: var(--studio-text); }
.empty-desc { max-width: 360px; font-size: 13px; line-height: 1.5; }
.pager { display: flex; justify-content: center; padding: 8px 0; }
</style>
