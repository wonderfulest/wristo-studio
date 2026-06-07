<template>
  <div class="theme-switcher" :aria-label="t('theme.selector')">
    <el-tooltip :content="t(`theme.${nextTheme}`)" placement="bottom">
      <button
        class="theme-button"
        type="button"
        :aria-label="t('theme.toggle')"
        :aria-pressed="theme === 'dark'"
        @click="themeStore.toggleTheme()"
      >
        <Icon :icon="theme === 'dark' ? 'solar:moon-bold-duotone' : 'solar:sun-2-bold-duotone'" />
        <span>{{ t(`theme.${theme}`) }}</span>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from '@/i18n'
import { useThemeStore } from '@/stores/theme'

const { t } = useI18n()
const themeStore = useThemeStore()
const theme = computed(() => themeStore.currentTheme)
const nextTheme = computed(() => (theme.value === 'dark' ? 'light' : 'dark'))
</script>

<style scoped>
.theme-switcher {
  display: inline-flex;
  align-items: center;
}

.theme-button {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--studio-radius-md);
  background: transparent;
  color: var(--studio-text);
  cursor: pointer;
  font: inherit;
  white-space: nowrap;
}

.theme-button:hover,
.theme-button:focus-visible {
  background: var(--studio-surface-soft);
  border-color: var(--studio-border);
  outline: none;
}

.theme-button :deep(svg) {
  width: 18px;
  height: 18px;
}

@media (max-width: 720px) {
  .theme-button {
    width: 44px;
    height: 44px;
    padding: 0;
  }

  .theme-button span {
    display: none;
  }
}
</style>
