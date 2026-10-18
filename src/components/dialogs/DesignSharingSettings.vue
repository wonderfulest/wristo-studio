<template>
  <section class="design-sharing-settings" :aria-busy="loading || saving">
    <h3>{{ t('designSharing.title') }}</h3>
    <div v-for="field in fields" :key="field.key" class="sharing-row">
      <div>
        <label :for="`${designUid}-${field.key}`">{{ t(field.label) }}</label>
        <p :id="`${designUid}-${field.key}-help`">{{ t(field.help) }}</p>
      </div>
      <button
        :id="`${designUid}-${field.key}`"
        type="button"
        role="switch"
        :aria-label="t(field.label)"
        :aria-describedby="`${designUid}-${field.key}-help`"
        :aria-checked="settings?.[field.key] ?? false"
        :disabled="loading || saving || !settings"
        @click="toggle(field.key)"
      >{{ settings?.[field.key] ? t('designSharing.on') : t('designSharing.off') }}</button>
    </div>
    <p v-if="error" class="sharing-error" role="alert">{{ error }}</p>
    <button v-if="error && !settings" type="button" :disabled="loading" @click="load">{{ t('designSharing.retry') }}</button>
    <p v-else class="sharing-status" role="status">{{ loading ? t('designSharing.loading') : saving ? t('designSharing.saving') : status }}</p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { getDesignSharing, updateDesignSharing, type DesignSharingSettings } from '@/api/wristo/designSharing'

const props = defineProps<{ designUid: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const fields = [
  { key: 'publiclyVisible', label: 'designSharing.public', help: 'designSharing.publicHelp' },
  { key: 'allowRemix', label: 'designSharing.copy', help: 'designSharing.copyHelp' }
] as const
const settings = ref<DesignSharingSettings | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const status = ref('')
let request = 0
async function load() {
  const current = ++request
  loading.value = true
  saving.value = false
  settings.value = null
  error.value = ''
  status.value = ''
  try {
    const result = await getDesignSharing(props.designUid)
    if (current === request) settings.value = result
  } catch {
    if (current === request) error.value = t('designSharing.loadFailed')
  } finally {
    if (current === request) loading.value = false
  }
}
async function toggle(key: keyof DesignSharingSettings) {
  if (!settings.value || loading.value || saving.value) return
  const current = request
  saving.value = true
  error.value = ''
  status.value = ''
  try {
    const result = await updateDesignSharing(props.designUid, { [key]: !settings.value[key] })
    if (current !== request) return
    settings.value = result
    status.value = t('designSharing.saved')
    emit('saved')
  } catch {
    if (current === request) error.value = t('designSharing.saveFailed')
  } finally {
    if (current === request) saving.value = false
  }
}
watch(() => props.designUid, load, { immediate: true })
onBeforeUnmount(() => { request++ })
</script>

<style scoped>
.design-sharing-settings h3 { margin: 0 0 16px; font-size: 16px; }
.sharing-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 16px 0; }
.sharing-row label { font-weight: 600; }
.sharing-row p, .sharing-status { margin: 6px 0 0; color: var(--studio-text-muted); font-size: 13px; line-height: 1.5; }
.sharing-row button { flex: 0 0 64px; min-height: 36px; border: 1px solid var(--studio-border-strong); border-radius: 20px; background: var(--studio-surface-soft); color: var(--studio-text); cursor: pointer; }
.sharing-row button[aria-checked='true'] { background: var(--studio-primary); color: white; }
.sharing-row button:disabled { opacity: .55; cursor: wait; }
.sharing-row button:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 3px; }
.sharing-error { color: var(--studio-danger, #c93838); font-size: 13px; }
</style>
