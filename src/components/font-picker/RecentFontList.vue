<template>
  <div class="font-section">
    <div class="section-header" @click="$emit('toggle')">
      <span class="arrow" :class="{ expanded: expanded }">›</span>
      RECENT
    </div>
    <div v-if="expanded" class="section-content">
      <div v-if="!fonts.length" class="no-fonts">No recent fonts</div>
      <div v-else class="font-family-group">
        <div
          v-for="font in fonts"
          :key="font.value"
          class="font-item"
          :class="{ active: modelValue === font.value }"
          @click="$emit('select', font)"
        >
          <div class="font-name">{{ font.family }}</div>
          <span class="preview-text" :style="{ fontFamily: font.value }">12:23 AM 72°F & Sunny 0123456789</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FontItem } from '@/types/font-picker'

defineProps<{
  fonts: FontItem[]
  modelValue: string
  expanded: boolean
}>()

defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'toggle'): void
}>()
</script>

<style scoped>
.font-section {
  border-bottom: 1px solid #eee;
}

.section-header {
  padding: 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  user-select: none;
}

.arrow {
  display: inline-block;
  margin-right: 8px;
  transition: transform 0.3s;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.section-content {
  padding: 8px 0;
}

.family-name {
  font-size: 12px;
  color: #909399;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #eee;
}

.font-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-item:hover {
  background: #f5f7fa;
}

.font-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.preview-text {
  font-size: 18px;
  color: #333;
}

.font-name {
  font-size: 12px;
  color: #909399;
}

.no-fonts {
  padding: 12px;
  color: #999;
  font-size: 13px;
  text-align: center;
}
</style>
