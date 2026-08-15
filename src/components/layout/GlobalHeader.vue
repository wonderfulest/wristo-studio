<template>
  <header class="app-header">
    <div class="header-left">
      <button class="brand" type="button" aria-label="Wristo Studio" @click="goWorkspace">
        <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="" class="logo">
        <h1 class="brand-title">Wristo Studio</h1>
      </button>
      <nav class="header-nav">
        <button type="button" class="nav-link" @click="openNewProject">
          <Icon icon="material-symbols:edit-square" />
          {{ t('nav.newProject') }}
        </button>
        <button type="button" class="nav-link" @click="goWorkspace">
          <Icon icon="material-symbols:list" />
          {{ t('nav.workspace') }}
        </button>
        <button type="button" class="nav-link" @click="openAcademy">
          <Icon icon="material-symbols:school-outline" />
          {{ t('editor.creatorAcademy') }}
        </button>
        <button type="button" class="nav-link" @click="openPrgInstallerGuide">
          <Icon icon="material-symbols:desktop-windows-outline" />
          {{ t('nav.prgInstaller') }}
        </button>
        <button type="button" class="nav-link" @click="openTokens">
          <Icon icon="material-symbols:data-object" />
          {{ t('tokens.nav') }}
        </button>
      </nav>
    </div>

    <DeviceDisplay />
    <ThemeSwitcher />
    <LanguageSwitcher />
    <UserMenu />
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import DeviceDisplay from '@/components/common/DeviceDisplay.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import UserMenu from './UserMenu.vue'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const openNewProject = (): void => {
  void router.push('/designs/new-projects')
}

const goWorkspace = (): void => {
  void router.push('/designs')
}

const openAcademy = (): void => {
  window.open('/academy', '_blank', 'noopener')
}

const openPrgInstallerGuide = (): void => {
  void router.push({ name: 'PrgInstallerGuide' })
}
const openTokens = (): void => { void router.push({ name: 'Tokens' }) }
</script>

<style scoped>
.app-header {
  height: 56px;
  background: var(--studio-surface-raised);
  border-bottom: 1px solid var(--studio-border);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  box-shadow: var(--studio-shadow-sm);
  position: sticky;
  top: 0;
  z-index: var(--studio-z-app-header);
  flex: 0 0 56px;
  min-width: 0;
}

.header-left, .brand, .header-nav, .nav-link {
  display: flex;
  align-items: center;
}

.header-left { gap: 22px; min-width: 0; flex: 1 1 auto; }
.brand { gap: 10px; min-width: max-content; border: 0; background: transparent; padding: 0; cursor: pointer; }
.logo { width: 30px; height: 30px; border-radius: 8px; }
.brand-title { font-size: 1.05rem; font-weight: 750; color: var(--studio-text); margin: 0; }
.header-nav { gap: 8px; min-width: 0; }
.nav-link { justify-content: center; gap: 7px; min-height: 40px; padding: 0 13px; color: var(--studio-text-muted); font-size: 14px; font-weight: 650; border: 1px solid transparent; border-radius: var(--studio-radius-md); background: transparent; cursor: pointer; white-space: nowrap; }
.nav-link:hover { color: var(--studio-primary); background: var(--studio-primary-soft); border-color: var(--studio-primary-border); }
.nav-link :deep(svg) { width: 18px; height: 18px; }

@media (max-width: 720px) {
  .app-header { gap: 8px; padding: 0 12px; overflow: hidden; }
  .header-left { gap: 10px; overflow: hidden; }
  .brand-title, .nav-link { font-size: 0; }
  .nav-link { width: 44px; padding: 0; flex: 0 0 44px; }
  .nav-link :deep(svg) { width: 20px; height: 20px; }
}
</style>
