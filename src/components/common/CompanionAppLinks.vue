<template>
  <section class="companion-app-links" :aria-label="t('companionApps.title')" :aria-busy="loading">
    <h3>{{ t('companionApps.title') }}</h3>
    <p>{{ t('companionApps.hint') }}</p>
    <p v-if="loading" role="status">{{ t('companionApps.loading') }}</p>
    <div v-else-if="failed" role="alert">
      {{ t('companionApps.loadFailed') }}
      <el-button size="small" @click="load">{{ t('companionApps.retry') }}</el-button>
    </div>
    <template v-else>
      <el-form-item v-for="row in rows" :key="row.key" :label="row.label" label-width="180px">
        <el-input :model-value="row.url" readonly :aria-label="row.label" :placeholder="t('companionApps.notConfigured')">
          <template #append>
            <el-button :disabled="!row.url" @click="copy(row.url)">{{ t('common.copy') }}</el-button>
          </template>
        </el-input>
      </el-form-item>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import { getCompanionApps, type CompanionApps } from '@/api/wristo/companionApps'

const props = defineProps<{ visible: boolean }>()
const { t } = useI18n()
const apps = ref<CompanionApps>({ ios: '', android: '', iosAlternatives: [], androidAlternatives: [] })
const loading = ref(false)
const failed = ref(false)
let requestId = 0
const rows = computed(() => [
  { key: 'ios', label: 'iOS App Store', url: apps.value.ios },
  ...apps.value.iosAlternatives.map((url, index) => ({ key: `ios-${index}`, label: t('companionApps.iosAlternative', { index: index + 1 }), url })),
  { key: 'android', label: 'Google Play', url: apps.value.android },
  ...apps.value.androidAlternatives.map((url, index) => ({ key: `android-${index}`, label: t('companionApps.androidAlternative', { index: index + 1 }), url })),
])
async function load() {
  const id = ++requestId
  loading.value = true
  failed.value = false
  try {
    const result = await getCompanionApps()
    if (id === requestId) apps.value = result
  } catch {
    if (id === requestId) failed.value = true
  } finally {
    if (id === requestId) loading.value = false
  }
}
watch(() => props.visible, visible => {
  if (visible) void load()
  else ++requestId
}, { immediate: true })
async function copy(url: string) {
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success(t('common.copied'))
  } catch {
    ElMessage.error(t('common.copyFailed'))
  }
}
</script>

<style scoped>
.companion-app-links { margin: 20px 0; padding: 16px; border: 1px solid var(--el-border-color); border-radius: 8px; }
h3 { margin: 0 0 8px; }
p { margin: 0 0 16px; color: var(--el-text-color-secondary); }
</style>
