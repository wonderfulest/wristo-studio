<template>
  <span class="angle-help-label">
    <span class="angle-help-label__text">{{ label }}</span>
    <el-tooltip :content="t('angleHelp.clockPositions')" placement="top" effect="light">
      <el-icon class="angle-help-label__icon" tabindex="0" :aria-label="t('angleHelp.clockPositions')">
        <QuestionFilled />
      </el-icon>
    </el-tooltip>
  </span>
</template>

<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

defineProps<{ label: string }>()

const { t } = useI18n()
</script>

<style scoped>
.angle-help-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.angle-help-label__icon {
  color: #909399;
  cursor: help;
  font-size: 14px;
  outline: none;
  transition: color 0.15s ease;
}

.angle-help-label__icon:hover,
.angle-help-label__icon:focus-visible {
  color: var(--el-color-primary);
}
</style>
