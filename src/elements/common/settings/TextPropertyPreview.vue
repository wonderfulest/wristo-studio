<template>
  <div class="text-property-preview">
    <div class="preview-header">
      <div class="preview-title">
        <span class="preview-label">{{ t('elementSettings.variableName') }}</span>
        <strong>{{ property.title }}</strong>
      </div>
      <code class="preview-key">prop.{{ propertyKey }}</code>
    </div>
    <div class="preview-subtitle">{{ t('elementSettings.defaultContent') }}</div>
    <pre class="preview-content">{{ content }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  propertyKey: string
  property: {
    title?: string
    value?: unknown
  }
}>()

const { t } = useI18n()

const content = computed(() => {
  const value = props.property.value
  if (value === null || value === undefined || value === '') {
    return t('common.noData')
  }
  return String(value)
})
</script>

<style scoped>
.text-property-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.preview-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.preview-title {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-label,
.preview-subtitle {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.preview-label {
  margin-right: 4px;
}

.preview-key {
  max-width: 112px;
  overflow: hidden;
  padding: 2px 6px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-content {
  min-height: 48px;
  max-height: 132px;
  margin: 0;
  overflow: auto;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
