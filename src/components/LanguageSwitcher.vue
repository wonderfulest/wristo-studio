<template>
  <div class="language-switcher" role="navigation" :aria-label="t('language.selector')">
    <button class="language-button" type="button" :aria-expanded="isOpen" @click="isOpen = !isOpen">
      <Icon icon="solar:global-line-duotone" />
      <span>{{ t(`language.${locale}`) }}</span>
      <el-icon :class="{ rotated: isOpen }"><ArrowDown /></el-icon>
    </button>
    <div class="language-options" :class="{ open: isOpen }">
      <button
        v-for="item in supportedLocales"
        :key="item"
        class="language-option"
        :class="{ active: item === locale }"
        type="button"
        @click="switchLanguage(item)"
      >
        {{ t(`language.${item}`) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { Icon } from '@iconify/vue'
import { useI18n } from '@/i18n'
import { SUPPORTED_LOCALES, useLocaleStore, type SupportedLocale } from '@/stores/locale'

const { locale, t } = useI18n()
const localeStore = useLocaleStore()
const isOpen = ref(false)
const supportedLocales = SUPPORTED_LOCALES

function switchLanguage(targetLocale: SupportedLocale) {
  localeStore.setLocale(targetLocale)
  isOpen.value = false
}
</script>

<style scoped>
.language-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.language-button,
.language-option {
  border: 1px solid transparent;
  background: transparent;
  color: var(--studio-text);
  cursor: pointer;
  font: inherit;
}

.language-button {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: var(--studio-radius-md);
  white-space: nowrap;
}

.language-button:hover,
.language-button:focus-visible {
  background: var(--studio-surface-soft);
  border-color: var(--studio-border);
  outline: none;
}

.language-button :deep(svg) {
  width: 18px;
  height: 18px;
}

.language-button .el-icon {
  transition: transform 0.18s ease;
}

.language-button .el-icon.rotated {
  transform: rotate(180deg);
}

.language-options {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 200;
  display: none;
  min-width: 132px;
  padding: 6px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-md);
}

.language-options.open {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.language-option {
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border-radius: var(--studio-radius-sm);
  text-align: left;
}

.language-option:hover,
.language-option.active {
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
}
</style>
