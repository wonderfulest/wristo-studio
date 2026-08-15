<template>
  <section v-if="tokens.length" class="token-preview-controls">
    <div class="token-preview-heading">
      <span>{{ t('expression.previewValues') }}</span>
      <small>{{ t('expression.previewValuesHint') }}</small>
    </div>
    <div v-for="token in tokens" :key="token.id" class="token-preview-row">
      <label :for="`token-preview-${token.id}`">
        <span>{{ token.labelCn }} / {{ token.label }}</span>
        <code>({{ token.code }})</code>
      </label>
      <el-switch
        v-if="token.valueType === 'boolean'"
        :id="`token-preview-${token.id}`"
        :model-value="Boolean(previewStore.tokenValues[token.id])"
        @update:model-value="previewStore.setTokenValue(token.id, Boolean($event))"
      />
      <el-input-number
        v-else-if="token.valueType === 'number'"
        :id="`token-preview-${token.id}`"
        :model-value="Number(previewStore.tokenValues[token.id])"
        controls-position="right"
        @update:model-value="previewStore.setTokenValue(token.id, $event)"
      />
      <el-input
        v-else
        :id="`token-preview-${token.id}`"
        :model-value="String(previewStore.tokenValues[token.id] ?? '')"
        @update:model-value="previewStore.setTokenValue(token.id, String($event))"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ExpressionTokenDefinition } from '@/engine/expression/types'
import { useExpressionPreviewStore } from '@/stores/expressionPreviewStore'
import { useI18n } from '@/i18n'

defineProps<{ tokens: readonly ExpressionTokenDefinition[] }>()
const previewStore = useExpressionPreviewStore()
const { t } = useI18n()
</script>

<style scoped>
.token-preview-controls { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.token-preview-heading, .token-preview-row, .token-preview-row label { display: flex; align-items: center; gap: 8px; }
.token-preview-heading { justify-content: space-between; }
.token-preview-heading small { color: var(--el-text-color-secondary); }
.token-preview-row { justify-content: space-between; }
.token-preview-row label { min-width: 0; }
.token-preview-row code { color: var(--el-text-color-secondary); }
.token-preview-row :deep(.el-input), .token-preview-row :deep(.el-input-number) { width: 150px; }
</style>
