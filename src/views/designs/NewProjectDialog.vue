<template>
  <el-dialog
    v-model="internalVisible"
    :title="t('project.newProject')"
    width="400px"
    :close-on-click-modal="false"
    append-to-body
    :z-index="4000"
  >
    <div class="dialog-body">
      <div class="field-label">{{ t('project.projectName') }}</div>
      <el-input
        v-model="localName"
        :placeholder="t('project.enterProjectName')"
        maxlength="50"
        show-word-limit
      />

      <div class="field-label size-label">{{ t('project.size') }}</div>
      <el-input
        value="454 x 454 pixels"
        disabled
      />
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleOk">{{ t('common.ok') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  initialName: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', name: string): void
  (e: 'cancel'): void
}>()

const internalVisible = ref(props.modelValue)
const localName = ref(props.initialName)

watch(
  () => props.modelValue,
  (val) => {
    internalVisible.value = val
    if (val) {
      // 每次打开时重置为传入的初始名称
      localName.value = props.initialName
    }
  }
)

watch(
  () => props.initialName,
  (val) => {
    if (!internalVisible.value) {
      localName.value = val
    }
  }
)

const handleCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const handleOk = () => {
  emit('confirm', localName.value)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  font-size: 13px;
  color: var(--studio-text-muted);
  margin-bottom: 4px;
}

.size-label {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
