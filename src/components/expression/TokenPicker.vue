<template>
  <el-select
    value=""
    filterable
    :placeholder="t('expression.insertToken')"
    @change="insertToken"
  >
    <el-option
      v-for="token in tokens"
      :key="token.id"
      :value="token.code"
      :label="`${token.label} (${token.code})`"
    >
      <div class="token-option">
        <span>{{ token.label }}</span>
        <code>({{ token.code }})</code>
      </div>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { useI18n } from '@/i18n'

const emit = defineEmits<{ insert: [value: string] }>()
const { t } = useI18n()
const tokens = DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions
const insertToken = (code: string) => emit('insert', `(${code})`)
</script>

<style scoped>
.token-option { display: flex; justify-content: space-between; gap: 12px; }
.token-option code { color: var(--el-text-color-secondary); }
</style>
