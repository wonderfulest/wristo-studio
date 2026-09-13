<template>
  <el-button size="small" :disabled="!text.trim()" @click="copyDescription">
    {{ t('goLive.copyGarminDescription') }}
  </el-button>
</template>

<script setup lang="ts">
import { showErrorOnce } from '@/utils/errorMessage'

import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import { stripDescriptionEmoji } from '@/utils/garminDescription'

const props = defineProps<{ text: string }>()
const { t } = useI18n()

async function copyDescription() {
  try {
    await navigator.clipboard.writeText(stripDescriptionEmoji(props.text))
    ElMessage.success(t('common.copied'))
  } catch (caughtError) {
    showErrorOnce(caughtError, t('common.copyFailed'))
  }
}
</script>
