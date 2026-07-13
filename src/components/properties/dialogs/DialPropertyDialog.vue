<template>
  <el-dialog v-model="visible" title="Dial Property" width="620px" :close-on-click-modal="false">
    <el-form ref="formRef" :model="formData" label-position="top">
      <el-form-item label="Title" prop="title" :rules="[{ required: true, message: 'Enter a title', trigger: 'blur' }]">
        <el-input v-model="formData.title" />
      </el-form-item>
      <PropertyKeyField v-model="formData.propertyKey" :is-edit="isEdit" default-key="dial_goal_1" placeholder="dial_goal_1" />
      <el-form-item label="Progress Mode">
        <el-segmented v-model="formData.dialMode" :options="modeOptions" :disabled="isEdit" @change="selectFirstCompatible" />
      </el-form-item>
      <el-form-item label="Data Type" prop="value" :rules="[{ required: true, message: 'Select a data type', trigger: 'change' }]">
        <el-select v-model="formData.value" style="width: 100%">
          <el-option v-for="option in compatibleOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </el-form-item>
      <div v-if="selectedOption" class="dial-meta">
        <code>{{ selectedOption.metricSymbol }}</code>
        <span v-if="selectedOption.dialMode === 'range'">{{ selectedOption.dialMin }} – {{ selectedOption.dialMax }}</span>
        <span v-else>Goal source: {{ selectedOption.dialGoalSource }}</span>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <el-button type="primary" @click="confirm">Confirm</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { DataTypeOptions } from '@/config/settings'
import type { DialProgressMode } from '@/types/settings'
import { usePropertiesStore } from '@/stores/properties'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'

const emit = defineEmits<{ confirm: [payload: Record<string, unknown>] }>()
const store = usePropertiesStore()
const visible = ref(false)
const isEdit = ref(false)
const formRef = ref<any>(null)
const modeOptions = [{ label: 'Goal', value: 'goal' }, { label: 'Range', value: 'range' }]
const formData = reactive({ title: '', propertyKey: '', dialMode: 'goal' as DialProgressMode, value: undefined as number | undefined })

const compatibleOptions = computed(() => DataTypeOptions.filter(option => option.dialMode === formData.dialMode))
const selectedOption = computed(() => compatibleOptions.value.find(option => option.value === formData.value) || null)

function nextKey(mode: DialProgressMode) {
  let index = 1
  while (store.allProperties[`dial_${mode}_${index}`]) index += 1
  return `dial_${mode}_${index}`
}

function selectFirstCompatible() {
  if (!compatibleOptions.value.some(option => option.value === formData.value)) {
    formData.value = compatibleOptions.value[0]?.value
  }
}

function show(data?: any) {
  isEdit.value = Boolean(data?.propertyKey)
  formData.dialMode = data?.dialMode === 'range' ? 'range' : 'goal'
  formData.propertyKey = data?.propertyKey || nextKey(formData.dialMode)
  formData.title = data?.title || (formData.dialMode === 'goal' ? 'Goal Dial' : 'Range Dial')
  formData.value = data?.value
  selectFirstCompatible()
  visible.value = true
}

async function confirm() {
  await formRef.value?.validate()
  emit('confirm', {
    type: 'dial',
    key: formData.propertyKey,
    title: formData.title,
    dialMode: formData.dialMode,
    options: compatibleOptions.value.map(option => ({ ...option })),
    defaultValue: formData.value,
    isEdit: isEdit.value,
  })
  visible.value = false
}

defineExpose({ show })
</script>

<style scoped>
.dial-meta { display: flex; justify-content: space-between; gap: 12px; color: var(--el-text-color-secondary); }
</style>
