<template>
  <div class="font-sections">
    <div v-for="section in sections" :key="section.name" class="font-section">
      <div class="section-header" @click="$emit('toggle', section.name)">
        <span class="arrow" :class="{ expanded: expandedMap[section.name] }">›</span>
        {{ section.name.toUpperCase() }}
      </div>
      <div v-if="expandedMap[section.name]" class="section-content">
        <div
          v-for="font in section.fonts"
          :key="font.value"
          class="font-item"
          :class="{ active: modelValue === font.value }"
          @click="$emit('select', font)"
        >
          <FontListItem
            :font-family="font.value"
            :type="type"
            :section-name="section.name"
            :font-url="font.src"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FontItem, Section } from '@/types/font-picker'
import FontListItem from '@/components/fonts/FontListItem.vue'

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
</script>

<style scoped>
.font-section {
  border-bottom: 1px solid var(--studio-border);
}

.section-header {
  padding: 12px;
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

.font-item.active :deep(.font-main) {
  border: 2px solid var(--studio-primary);
  box-shadow: 0 0 0 2px var(--studio-primary-soft), var(--studio-shadow-md);
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
</style>
