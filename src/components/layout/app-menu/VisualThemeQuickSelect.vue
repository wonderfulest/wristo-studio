<template>
  <el-dropdown
    class="visual-theme-quick-select"
    placement="bottom-start"
    popper-class="visual-theme-quick-select__popper"
    trigger="click"
    @command="handleCommand"
  >
    <button
      type="button"
      class="visual-theme-trigger"
      data-visual-theme-trigger
      :aria-label="t('visualTheme.quickSelectAria', { name: triggerLabel })"
    >
      <el-icon><Brush /></el-icon>
      <span class="visual-theme-trigger__label">{{ triggerLabel }}</span>
      <el-icon class="visual-theme-trigger__arrow"><ArrowDown /></el-icon>
    </button>

    <template #dropdown>
      <el-dropdown-menu>
        <template v-if="enabled && themes.length">
          <el-dropdown-item
            v-for="theme in themes"
            :key="theme.id"
            :command="theme.id"
            :data-theme-option="theme.id"
            :class="{ 'is-selected': theme.id === currentTheme?.id }"
          >
            <el-icon class="theme-option__check">
              <Check v-if="theme.id === currentTheme?.id" />
            </el-icon>
            <span class="theme-option__name">{{ theme.name }}</span>
            <span
              v-if="theme.id === config?.defaultThemeId"
              class="theme-option__default"
              :data-theme-default="theme.id"
            >
              {{ t('visualTheme.defaultBadge') }}
            </span>
          </el-dropdown-item>
          <el-dropdown-item divided command="__edit__" data-theme-edit>
            <el-icon><Edit /></el-icon>
            {{ t('visualTheme.edit') }}
          </el-dropdown-item>
        </template>
        <el-dropdown-item v-else command="__edit__" data-theme-enable-edit>
          <el-icon><Edit /></el-icon>
          {{ t('visualTheme.enableAndEdit') }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, Brush, Check, Edit } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'
import { useVisualThemeStore } from '@/stores/visualThemeStore'

const emit = defineEmits<{ edit: [] }>()
const { t } = useI18n()
const store = useVisualThemeStore()

const config = computed(() => store.config)
const themes = computed(() => store.themes)
const enabled = computed(() => Boolean(config.value?.enabled))
const defaultTheme = computed(() =>
  themes.value.find((theme) => theme.id === config.value?.defaultThemeId))
const currentTheme = computed(() =>
  themes.value.find((theme) => theme.id === store.previewThemeId)
  ?? defaultTheme.value
  ?? themes.value[0])
const triggerLabel = computed(() => currentTheme.value?.name || t('visualTheme.menu'))

const handleCommand = (command: string) => {
  if (command === '__edit__') {
    emit('edit')
    return
  }
  if (!enabled.value || command === store.previewThemeId) return
  store.setPreviewTheme(command)
}
</script>

<style scoped>
.visual-theme-quick-select {
  flex: 0 0 auto;
  margin: 0 3px;
}

.visual-theme-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 190px;
  height: 36px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: var(--studio-radius-md);
  color: var(--studio-text-muted);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.visual-theme-trigger:hover,
.visual-theme-trigger:focus-visible,
.visual-theme-quick-select.is-opened .visual-theme-trigger {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  border-color: var(--studio-primary-border);
  outline: none;
}

.visual-theme-trigger__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visual-theme-trigger__arrow {
  flex: 0 0 auto;
  margin-left: 1px;
  font-size: 12px;
}

@media (max-width: 920px) {
  .visual-theme-quick-select {
    margin: 0 2px;
  }

  .visual-theme-trigger {
    max-width: 150px;
    padding: 0 10px;
  }
}
</style>

<style>
.visual-theme-quick-select__popper .el-dropdown-menu {
  min-width: 220px;
}

.visual-theme-quick-select__popper .el-dropdown-menu__item {
  display: flex;
  gap: 8px;
}

.visual-theme-quick-select__popper .el-dropdown-menu__item.is-selected {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.visual-theme-quick-select__popper .theme-option__check {
  width: 16px;
  margin: 0;
}

.visual-theme-quick-select__popper .theme-option__name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visual-theme-quick-select__popper .theme-option__default {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 999px;
  color: var(--studio-text-muted);
  background: var(--studio-surface-muted, #f3f4f6);
  font-size: 11px;
  line-height: 18px;
}
</style>
