<template>
  <el-form-item :label="t('property.titleCn')">
    <el-input v-model="model" :placeholder="t('property.titleCnPlaceholder')" />
  </el-form-item>
</template>

<script setup lang="ts">
import { useI18n } from '@/i18n'

const model = defineModel<string>({ default: '' })
const { t } = useI18n()
</script>
