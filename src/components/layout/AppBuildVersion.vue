<template>
  <span v-if="version" class="app-build-version">{{ t('platform.latestBuildVersion', { version }) }}</span>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import { loadAppBuildVersion } from '@/api/wristo/platformVersions'

const { t } = useI18n()
const version = ref<string | null>(null)
onMounted(async () => { version.value = await loadAppBuildVersion() })
</script>

<style scoped>
.app-build-version {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 10;
  background: var(--studio-bg);
  white-space: nowrap;
  display: block;
  flex-shrink: 0;
  padding: 6px 16px;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 18px;
  text-align: left;
}
</style>
