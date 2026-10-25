<template>
  <span v-if="version" class="app-build-version">Connect IQ App Build · v{{ version }}</span>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadAppBuildVersion } from '@/api/wristo/platformVersions'

const version = ref<string | null>(null)
onMounted(async () => { version.value = await loadAppBuildVersion() })
</script>

<style scoped>
.app-build-version {
  display: block;
  flex-shrink: 0;
  padding: 6px 16px;
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}
</style>
