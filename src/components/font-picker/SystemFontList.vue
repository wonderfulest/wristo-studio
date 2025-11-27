<template>
  <div class="font-sections">
    <div v-for="section in sections" :key="section.name" class="font-section">
      <div class="section-header" @click="$emit('toggle', section.name)">
        <span class="arrow" :class="{ expanded: expandedMap[section.name] }">›</span>
        {{ section.name.toUpperCase() }}
      </div>
      <div v-if="expandedMap[section.name]" class="section-content">
        <div v-for="group in groupByFamily(section.fonts)" :key="group.family" class="font-family-group">
          <div class="family-name">{{ group.family }}</div>
          <div
            v-for="font in group.fonts"
            :key="font.value"
            class="font-item"
            :class="{ active: modelValue === font.value }"
            @click="$emit('select', font)"
          >
            <FontPreviewText :font-family="font.value" :type="type" :section-name="section.name" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FontItem, Section } from '@/types/font-picker'
import FontPreviewText from './FontPreviewText.vue'

const { sections, expandedMap, modelValue, type } = defineProps<{
  sections: Section[]
  expandedMap: Record<string, boolean>
  modelValue: string
  type?: string
}>()

defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'toggle', sectionName: string): void
}>()

const groupByFamily = (fonts: FontItem[]) => {
  const groups = new Map<string, FontItem[]>()
  fonts.forEach((font) => {
    if (!groups.has(font.family)) groups.set(font.family, [])
    groups.get(font.family)!.push(font)
  })
  return Array.from(groups.entries()).map(([family, fonts]) => ({ family, fonts }))
}
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

.preview-text-icon {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
