<template>
  <el-dialog v-model="visible" title="Bind Assets to Glyph" width="860px">
    <div class="bind-toolbar">
      <div class="left">
        <el-input
          :model-value="keyword"
          placeholder="Search assets..."
          clearable
          @clear="$emit('search')"
          @update:model-value="$emit('update:keyword', $event)"
          @keyup.enter="$emit('search')"
          style="max-width: 280px"
        />
        <el-button :loading="loading" @click="$emit('search')">Search</el-button>
      </div>
    </div>
    <el-table :data="assets" v-loading="loading" height="420" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="48" />
      <el-table-column label="Preview" width="96">
        <template #default="{ row }">
          <img :src="getAssetPreview(row)" alt="preview" style="width:48px;height:48px;object-fit:contain" />
        </template>
      </el-table-column>
      <el-table-column prop="id" label="ID" width="120" />
      <el-table-column prop="format" label="Format" width="120" />
      <el-table-column prop="displayType" label="Display" width="120">
        <template #default="{ row }">
          {{ row.displayType || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="author" label="Author" />
      <el-table-column label="Action" width="140" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" :loading="binding" @click="$emit('bind', row.id)">Choose</el-button>
        </template>
      </el-table-column>
    </el-table>
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
      <el-button @click="visible = false">Cancel</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IconAssetVO } from '@/api/wristo/iconGlyph'

const props = defineProps<{
  modelValue: boolean
  assets: IconAssetVO[]
  loading: boolean
  page: number
  pageSize: number
  total: number
  keyword: string
  binding: boolean
  selectedIds?: number[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'update:keyword', v: string): void
  (e: 'selectionChange', ids: number[]): void
  (e: 'pageChange', page: number): void
  (e: 'search'): void
  (e: 'confirm'): void
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

const onSelectionChange = (rows: IconAssetVO[]) => {
  emit('selectionChange', rows.map(r => r.id))
}
</script>

<style scoped>
.bind-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.bind-toolbar .left { display: flex; align-items: center; gap: 8px; }
.bind-toolbar .right { display: flex; align-items: center; gap: 8px; }
.pager { display: flex; justify-content: center; padding: 8px 0; }
</style>
