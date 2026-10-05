<!-- src/App.vue -->
<template>
  <router-view></router-view>
  <CookieConsent />
  <InsufficientCreditsDialog />
  <WrtImportProgressDialog />
</template>

<script setup>
import WrtImportProgressDialog from '@/components/WrtImportProgressDialog.vue'
import InsufficientCreditsDialog from '@/components/InsufficientCreditsDialog.vue'
import CookieConsent from '@/components/CookieConsent.vue'
import { useLocaleStore } from '@/stores/locale'
import { useShareVisit } from '@/composables/useShareVisit'
import { useThemeStore } from '@/stores/theme'

useShareVisit()

const localeStore = useLocaleStore()
localeStore.syncDocumentLang()

const themeStore = useThemeStore()
themeStore.syncDocumentTheme()
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
}

* {
  box-sizing: border-box;
}
</style>
