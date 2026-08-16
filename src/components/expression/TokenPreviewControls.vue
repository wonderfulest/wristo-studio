<template>
  <section v-if="tokens.length" class="token-preview-controls">
    <div class="token-preview-heading">
      <span>{{ t('expression.previewValues') }}</span>
      <small>{{ t('expression.previewValuesHint') }}</small>
    </div>
    <div v-for="token in tokens" :key="token.id" class="token-preview-row" :class="{ 'enum-preview-row': token.enumValues?.length }">
      <label :for="`token-preview-${token.id}`">
        <span>{{ token.labelCn }} / {{ token.label }}</span>
        <code>({{ token.code }})</code>
      </label>
      <div v-if="token.enumValues?.length" class="enum-preview-tags" role="radiogroup">
        <el-tag
          v-for="option in enumOptions(token)"
          :key="option.value"
          class="enum-preview-tag"
          :type="previewStore.tokenValues[token.id] === option.value ? 'primary' : 'info'"
          :effect="previewStore.tokenValues[token.id] === option.value ? 'dark' : 'plain'"
          role="radio"
          :aria-checked="previewStore.tokenValues[token.id] === option.value"
          @click="previewStore.setTokenValue(token.id, option.value)"
        >
          {{ option.text }}
        </el-tag>
      </div>
      <el-switch
        v-else-if="token.valueType === 'boolean'"
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
import { resolveEnumPreviewOptions } from './tokenPreviewModel'

defineProps<{ tokens: readonly ExpressionTokenDefinition[] }>()
const previewStore = useExpressionPreviewStore()
const { locale, t } = useI18n()
const enumOptions = (token: ExpressionTokenDefinition) =>
  resolveEnumPreviewOptions(token.enumValues || [], locale.value)
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
.enum-preview-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.enum-preview-tag { cursor: pointer; user-select: none; }
.enum-preview-row { display: grid; justify-content: stretch; }
.enum-preview-row .enum-preview-tags { justify-content: flex-start; }
</style>
