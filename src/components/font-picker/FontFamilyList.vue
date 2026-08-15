<template>
  <div class="font-family-list">
    <div v-for="group in groups" :key="group.key" class="font-family-group" :data-family="group.key">
      <template v-if="group.fonts.length === 1">
        <div
          class="font-item"
          :class="{ active: modelValue === group.fonts[0].value }"
          :data-font-slug="group.fonts[0].value"
          :data-bitmap-recipe-preview="hasRecipe(group.fonts[0]) ? '' : undefined"
          :style="recipeCardStyle(group.fonts[0])"
          @click="emit('select', group.fonts[0])">
          <span v-if="hasRecipe(group.fonts[0])" class="bitmap-recipe-preview-badge" aria-label="Bitmap recipe preview">Preview</span>
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
          <div
            v-for="font in group.fonts"
            :key="font.value"
            class="font-item"
            :class="{ active: modelValue === font.value }"
            :data-font-slug="font.value"
            :data-bitmap-recipe-preview="hasRecipe(font) ? '' : undefined"
            :style="recipeCardStyle(font)"
            @click="emit('select', font)">
            <span v-if="hasRecipe(font)" class="bitmap-recipe-preview-badge" aria-label="Bitmap recipe preview">Preview</span>
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
import { parseBitmapFontRecipe } from '@/features/bitmap-font-maker/recipePreview'

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

const recipeFor = (font: FontItem) => parseBitmapFontRecipe(font.bitmapRecipe)
const hasRecipe = (font: FontItem) => recipeFor(font) !== null
const recipeCardStyle = (font: FontItem) => {
  const recipe = recipeFor(font)
  if (!recipe) return undefined
  const outlined = recipe.outlineMode !== 'fill' && recipe.outlineWidthEm > 0
  return {
    fontWeight: recipe.fontWeight,
    fontStyle: recipe.italicAngle === 0 ? 'normal' : 'italic',
    '--bitmap-preview-stroke': outlined ? `${Math.max(1, Math.round(recipe.outlineWidthEm * 24))}px currentColor` : '0',
    textShadow: outlined ? '0 0 1px var(--studio-surface)' : undefined
  }
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
  position: relative;
  width: 100%;
  padding: 0;
  cursor: pointer;
}

.bitmap-recipe-preview-badge {
  position: absolute;
  z-index: 2;
  right: 9px;
  bottom: 7px;
  padding: 1px 6px;
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  color: var(--studio-text-subtle);
  background: var(--studio-surface);
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0.04em;
  -webkit-text-stroke: 0;
  pointer-events: none;
}

.font-item[data-bitmap-recipe-preview] :deep(.preview-text) {
  -webkit-text-stroke: var(--bitmap-preview-stroke);
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
