<template>
  <div class="font-family-list">
    <div v-for="group in groups" :key="group.key" class="font-family-group" :data-family="group.key">
      <template v-if="group.fonts.length === 1">
        <div class="font-item" :class="{ active: modelValue === group.fonts[0].value }" @click="emit('select', group.fonts[0])">
          <FontListItem
            v-bind="itemProps(group.fonts[0])"
            @edit-search-index="emit('editSearchIndex', group.fonts[0])"
            @favorite-changed="(id, weight) => emit('favoriteChanged', id, weight)"
            @removed="emit('removed', $event)" />
        </div>
      </template>
      <template v-else>
        <button class="font-family-summary" type="button" :aria-expanded="isExpanded(group.key)" @click="toggle(group.key)">
          <span class="font-family-chevron" :class="{ expanded: isExpanded(group.key) }">›</span>
          <span class="font-family-count">{{ group.fonts.length }}</span>
          <FontListItem v-bind="summaryProps(group.representative, group.family)" />
        </button>
        <div v-show="isExpanded(group.key)" class="font-family-weights">
          <div v-for="font in group.fonts" :key="font.value" class="font-item" :class="{ active: modelValue === font.value }" @click="emit('select', font)">
            <FontListItem
              v-bind="itemProps(font)"
              @edit-search-index="emit('editSearchIndex', font)"
              @favorite-changed="(id, weight) => emit('favoriteChanged', id, weight)"
              @removed="emit('removed', $event)" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import FontListItem from '@/components/fonts/FontListItem.vue'
import type { FontItem } from '@/types/font-picker'
import { groupFontsByFamily } from './fontFamilyGroups'

const props = defineProps<{
  fonts: FontItem[]
  modelValue: string
  type?: string
  isRecent?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', font: FontItem): void
  (e: 'editSearchIndex', font: FontItem): void
  (e: 'favoriteChanged', id: number, favoriteWeight: number | null | undefined): void
  (e: 'removed', id: number): void
}>()

const expandedFamilies = reactive(new Set<string>())
const groups = computed(() => groupFontsByFamily(props.fonts, props.modelValue))

const expandSelectedFamily = () => {
  const selected = groups.value.find((group) => group.fonts.some((font) => font.value === props.modelValue))
  if (selected && selected.fonts.length > 1) expandedFamilies.add(selected.key)
}

watch([groups, () => props.modelValue], expandSelectedFamily, { immediate: true })

const isExpanded = (key: string) => expandedFamilies.has(key)
const toggle = (key: string) => {
  if (expandedFamilies.has(key)) expandedFamilies.delete(key)
  else expandedFamilies.add(key)
}

const commonProps = (font: FontItem) => ({
  fontFamily: font.value,
  type: font.type || props.type,
  language: font.language,
  isSystem: font.isSystem === true,
  isMonospace: font.isMonospace === true,
  fontUrl: font.src,
  compact: true
})

const itemProps = (font: FontItem) => ({
  ...commonProps(font),
  label: font.label,
  fontId: font.id,
  styleTags: font.styleTags,
  favoriteWeight: font.favoriteWeight,
  canEditSearchIndex: !!font.id,
  isRecent: props.isRecent
})

const summaryProps = (font: FontItem, family: string) => ({
  ...commonProps(font),
  label: family
})
</script>

<style scoped>
.font-family-list,
.font-family-weights {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.font-family-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.font-family-summary {
  position: relative;
  width: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.font-family-summary:hover :deep(.font-main) {
  background: var(--studio-surface-soft);
}

.font-family-chevron,
.font-family-count {
  position: absolute;
  z-index: 1;
  top: 7px;
  color: var(--studio-text-subtle);
  pointer-events: none;
}

.font-family-chevron {
  left: 8px;
  font-size: 20px;
  line-height: 20px;
  transition: transform 0.2s ease;
}

.font-family-chevron.expanded {
  transform: rotate(90deg);
}

.font-family-count {
  right: 10px;
  min-width: 20px;
  padding: 1px 6px;
  border: 1px solid var(--studio-border);
  border-radius: 10px;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}

.font-family-summary :deep(.font-header) {
  padding-left: 24px;
  padding-right: 42px;
}

.font-family-weights {
  padding-left: 14px;
  border-left: 2px solid var(--studio-border);
}

.font-item {
  width: 100%;
  padding: 0;
  cursor: pointer;
}

.font-item:hover {
  background: var(--studio-surface-soft);
}

.font-item.active :deep(.font-main) {
  border: 2px solid var(--studio-primary);
  box-shadow:
    0 0 0 2px var(--studio-primary-soft),
    var(--studio-shadow-md);
}
</style>
