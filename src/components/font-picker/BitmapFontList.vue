<template>
  <div class="bitmap-font-list">
    <div
      v-for="font in fonts"
      :key="font.id"
      class="bitmap-font-item"
      :class="{ active: font.id === activeId }"
    >
      <div class="info" @click="() => emit('select', font)">
        <div class="name">{{ font.fontName }}</div>
      </div>
      <div class="actions">
        <el-button type="text" size="small" @click.stop="() => emit('edit', font)">
          Edit
        </el-button>
      </div>
    </div>

    <div v-if="!fonts.length" class="bitmap-font-empty">
      No bitmap fonts yet.
    </div>

    <div v-if="total > pageSize" class="bitmap-font-pager">
      <el-pagination
        background
        layout="prev, pager, next"
        :current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        small
        @current-change="(p:number) => emit('page-change', p)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BitmapFontVO } from '@/api/wristo/bitmapFont'

const props = defineProps<{
  fonts: BitmapFontVO[]
  activeId: number | null
  pageNum: number
  pageSize: number
  total: number
}>()

const emit = defineEmits<{
  (e: 'select', font: BitmapFontVO): void
  (e: 'edit', font: BitmapFontVO): void
  (e: 'page-change', page: number): void
}>()
</script>

<style scoped>
.bitmap-font-list {
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.bitmap-font-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.bitmap-font-item:hover {
  background: #f5f7fa;
}

.bitmap-font-item.active {
  background: #ecf5ff;
  box-shadow: 0 0 0 1px #409eff inset;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  margin-top: 2px;
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: #909399;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  background: #f4f4f5;
}

.tag.default {
  background: #ecf5ff;
  color: #409eff;
}

.tag.version {
  background: #f0f9eb;
  color: #67c23a;
}

.actions {
  margin-left: 8px;
}

.bitmap-font-empty {
  padding: 12px 4px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.bitmap-font-pager {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
}
</style>
