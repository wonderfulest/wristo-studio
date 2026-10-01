<template>
  <header class="app-header">
    <RouterLink to="/faces" class="brand" aria-label="Wristo Studio">
      <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="" class="logo" />
      <span>Wristo <strong>Studio</strong></span>
    </RouterLink>
    <nav class="header-nav" aria-label="Main navigation">
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="nav-link"
        :class="{ active: isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >{{ item.label }}</RouterLink>
    </nav>
    <div class="header-tools">
      <RouterLink to="/tokens" class="tokens-link" :aria-label="t('tokens.nav')" :title="t('tokens.nav')">
        <Icon icon="material-symbols:data-object" />
      </RouterLink>
      <ThemeSwitcher />
      <LanguageSwitcher />
      <UserMenu />
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useRoute } from 'vue-router'
import '@fontsource/yantramanav/latin-400.css'
import '@fontsource/yantramanav/latin-700.css'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import UserMenu from './UserMenu.vue'
import { useI18n } from '@/i18n'

const route = useRoute()
const { t } = useI18n()
const navigation = [
  { to: '/faces', label: 'Faces' },
  { to: '/designs', label: 'My Designs' },
  { to: '/design', label: 'Studio' },
  { to: '/prg-installer', label: 'Installer' },
  { to: '/academy', label: 'Creator Academy' },
]
const isActive = (path: string): boolean => {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<style scoped>
.app-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  min-height: 76px;
  padding: 0 32px;
  background: var(--studio-surface-raised);
  color: var(--studio-text);
  border-bottom: 1px solid var(--studio-border);
  position: sticky;
  top: 0;
  z-index: var(--studio-z-app-header);
  flex: 0 0 auto;
  font-family: 'Yantramanav', sans-serif;
}
.brand, .header-nav, .header-tools, .tokens-link {
  display: flex;
  align-items: center;
}
.brand {
  gap: 10px;
  min-width: 0;
  font-size: 23px;
  white-space: nowrap;
  text-decoration: none;
  color: inherit;
}
.brand > span { overflow: hidden; text-overflow: ellipsis; }
.brand strong { font-weight: 400; color: var(--studio-text-muted); }
.logo { width: 32px; height: 32px; flex-shrink: 0; }
.header-nav { gap: 8px; min-width: 0; overflow-x: auto; }
.nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 7px;
  font-size: 15px;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
}
.nav-link:hover { background: var(--studio-surface-soft); }
.nav-link.active { background: var(--studio-primary-soft); color: var(--studio-primary); }
.header-tools { gap: 4px; min-width: 0; }
.tokens-link { justify-content: center; width: 36px; min-height: 44px; color: var(--studio-text-muted); }
.tokens-link svg { width: 20px; height: 20px; }
.brand:focus-visible, .nav-link:focus-visible, .tokens-link:focus-visible {
  outline: 2px solid var(--studio-primary);
  outline-offset: -2px;
}
@media (max-width: 1200px) {
  .app-header { grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; padding: 10px 20px 0; }
  .header-tools { grid-column: 2; grid-row: 1; }
  .header-nav { grid-column: 1 / -1; padding-bottom: 8px; }
}
@media (max-width: 600px) {
  .app-header { padding: 8px 12px 0; gap: 4px; }
  .brand { gap: 6px; font-size: 18px; }
  .logo { width: 26px; height: 26px; }
  .header-tools { gap: 0; }
  .tokens-link { width: 32px; }
  .header-tools :deep(.theme-button), .header-tools :deep(.language-button) { width: 32px; padding: 0; justify-content: center; }
  .header-tools :deep(.theme-button span), .header-tools :deep(.language-button span), .header-tools :deep(.language-button .el-icon) { display: none; }
  .nav-link { padding: 0 12px; }
}
</style>
