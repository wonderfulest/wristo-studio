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
          <FontListItem
            :label="font.family"
            :font-family="font.value"
            :type="type"
            :font-url="font.src"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FontItem } from '@/types/font-picker'
import FontListItem from '@/components/fonts/FontListItem.vue'

defineProps<{
  fonts: FontItem[]
  modelValue: string
  expanded: boolean
  type?: string
}>()

defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'toggle'): void
}>()
</script>

<style scoped>
.font-section {
  border-bottom: 1px solid var(--studio-border);
}

.section-header {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--studio-text);
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
  color: var(--studio-text-subtle);
  padding: 8px 12px;
  background: var(--studio-surface-soft);
  border-bottom: 1px solid var(--studio-border);
}

.font-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-item:hover {
  background: var(--studio-surface-soft);
}

.font-item.active {
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
}

.preview-text {
  font-size: 18px;
  color: var(--studio-text);
}

.preview-text-icon {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.font-name {
  font-size: 12px;
  color: var(--studio-text-subtle);
}

.no-fonts {
  padding: 12px;
  color: var(--studio-text-subtle);
  font-size: 13px;
  text-align: center;
}
</style>
