<template>
  <el-dialog v-model="dialogVisible" class="property-dialog" :title="uiText.editTitle" width="720px" :close-on-click-modal="false" :destroy-on-close="true">
    <el-form ref="formRef" :model="formData" label-position="top" class="property-form">
      <div class="property-hero">
        <div>
          <div class="property-hero-kicker">{{ uiText.editTitle }}</div>
          <div class="property-hero-title">{{ formData.title || uiText.editTitle }}</div>
        </div>
        <code class="property-hero-key">prop.{{ formData.propertyKey || 'date_1' }}</code>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ uiText.basicInformation }}</h3>
        <div class="basic-grid">
          <el-form-item :label="uiText.title" prop="title" :rules="[{ required: true, message: uiText.titleRequired, trigger: 'blur' }]">
            <el-input v-model="formData.title" :placeholder="uiText.editTitle" />
          </el-form-item>
          <PropertyKeyField v-model="formData.propertyKey" :is-edit="isEdit" default-key="date_1" placeholder="date_1" />
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">{{ uiText.dateOptions }}</h3>
          <div class="section-actions">
            <el-button type="primary" link :disabled="addableOptions.length === 0" @click="openAddOptions">{{ uiText.addOption }}</el-button>
            <el-button type="primary" link @click="restoreSystemDefaults">{{ uiText.restoreDefaults }}</el-button>
          </div>
        </div>
        <el-form-item :label="uiText.defaultValue" prop="defaultValue">
          <el-select v-model.number="formData.defaultValue" style="width: 100%">
            <el-option v-for="option in selectedOptions" :key="option.value" :label="`${optionLabel(option)} · ${option.example}`" :value="option.value">
              <div class="default-option-content">
                <span>{{ optionLabel(option) }}</span>
                <span class="default-option-example">{{ option.example }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-collapse v-model="activeOptions" class="options-collapse">
          <el-collapse-item name="options">
            <template #title>{{ uiText.dateOptions }}（{{ selectedOptions.length }}）</template>
            <el-form-item prop="options">
              <div class="options-list">
                <div class="option-batch-actions">
                  <el-checkbox v-model="allOptionsSelected" :indeterminate="someOptionsSelected">{{ uiText.selectAll }}</el-checkbox>
                  <el-button type="danger" link :disabled="selectedForDeletion.length === 0" @click="deleteSelectedOptions">
                    {{ uiText.deleteSelected }}（{{ selectedForDeletion.length }}）
                  </el-button>
                </div>
                <div v-for="(option, index) in selectedOptions" :key="option.value" class="option-item">
                  <el-checkbox v-model="selectedForDeletion" :value="option.value" />
                  <div class="option-content date-option-content">
                    <span class="option-label">{{ optionLabel(option) }}</span>
                    <span class="option-example">{{ option.example }}</span>
                  </div>
                  <div class="option-actions">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      :disabled="formData.defaultValue === option.value"
                      @click="setDefaultValue(option.value)"
                    >
                      {{ formData.defaultValue === option.value ? uiText.currentDefault : uiText.setAsDefault }}
                    </el-button>
                    <el-tooltip :content="uiText.moveUp" placement="top" :disabled="index === 0">
                      <el-button type="primary" link :disabled="index === 0" @click="moveOption(index, 'up')"><el-icon><ArrowUp /></el-icon></el-button>
                    </el-tooltip>
                    <el-tooltip :content="uiText.moveDown" placement="top" :disabled="index === selectedOptions.length - 1">
                      <el-button type="primary" link :disabled="index === selectedOptions.length - 1" @click="moveOption(index, 'down')"><el-icon><ArrowDown /></el-icon></el-button>
                    </el-tooltip>
                    <el-tooltip :content="uiText.delete" placement="top" :disabled="selectedOptions.length <= 1">
                      <el-button type="danger" link :disabled="selectedOptions.length <= 1" @click="deleteOption(index)"><el-icon><Delete /></el-icon></el-button>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ uiText.messages }}</h3>
        <div class="message-grid">
          <el-form-item :label="uiText.promptOptional">
            <el-input v-model="formData.prompt" type="textarea" :rows="3" resize="none" :placeholder="uiText.promptPlaceholder" />
          </el-form-item>
          <el-form-item :label="uiText.errorMessageOptional">
            <el-input v-model="formData.errorMessage" type="textarea" :rows="3" resize="none" :placeholder="uiText.errorPlaceholder" />
          </el-form-item>
        </div>
      </div>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ uiText.cancel }}</el-button>
        <el-button type="primary" @click="handleConfirm">{{ uiText.confirm }}</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="addOptionsVisible" :title="uiText.addDateOptions" width="560px" append-to-body destroy-on-close :close-on-click-modal="false">
    <div class="date-length-actions">
      <span class="date-length-label">{{ uiText.selectByLength }}</span>
      <el-button v-for="group in lengthGroups" :key="group.value" size="small" @click="selectLengthGroup(group.value)">
        {{ group.label }}
      </el-button>
    </div>
    <el-select v-model="pendingOptionValues" multiple filterable :placeholder="uiText.selectDateOptions" style="width: 100%">
      <el-option v-for="option in addableOptions" :key="option.value" :label="`${optionLabel(option)} · ${option.example}`" :value="option.value" />
    </el-select>
    <template #footer>
      <el-button @click="addOptionsVisible = false">{{ uiText.cancel }}</el-button>
      <el-button type="primary" :disabled="pendingOptionValues.length === 0" @click="confirmAddOptions">{{ uiText.confirm }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowDown, ArrowUp, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { getCatalogDateFormatOptions, type CatalogDateFormatOption } from '@/domain/dateFormatCatalog'
import { useDesignStore } from '@/stores/designStore'
import { usePropertiesStore } from '@/stores/properties'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { useI18n } from '@/i18n'
import type { OptionFormat } from '@/types/settings'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import { getCommonDateFormatterValues, resolveDateFormatterValues } from './datePropertyOptions'

type DatePayload = { type: 'date'; key: string; title: string; defaultValue: number; options: Array<{ label: string; labelCn?: string; value: number }>; prompt: string; errorMessage: string; isEdit: boolean }
const emit = defineEmits<{ confirm: [payload: DatePayload] }>()
const designStore = useDesignStore()
const propertiesStore = usePropertiesStore()
const dataCatalogStore = useDataCatalogStore()
const { locale } = useI18n()
const dialogVisible = ref(false)
const addOptionsVisible = ref(false)
const formRef = ref<any>(null)
const isEdit = ref(false)
const activeOptions = ref<string[]>([])
const pendingOptionValues = ref<number[]>([])
const formData = reactive({ title: '', propertyKey: '', type: 'date' as const, defaultValue: 0, prompt: '', errorMessage: '' })
const selectedValues = ref<number[]>([])
const selectedForDeletion = ref<number[]>([])
const isChineseUi = computed(() => String(locale.value).startsWith('zh'))
const uiText = computed(() => isChineseUi.value ? {
  editTitle: '日期选择', basicInformation: '基础信息', title: '标题', titleRequired: '请输入标题', defaultValue: '默认值', dateOptions: '日期选项', addOption: '添加选项', restoreDefaults: '恢复系统默认', addDateOptions: '添加日期选项', selectDateOptions: '请选择要添加的日期格式', selectByLength: '按字符长度全选', lengthOneTwo: '1–2 字', lengthThreeFour: '3–4 字', lengthFiveSix: '5–6 字', lengthSevenPlus: '≥7 字', selectAll: '全选', deleteSelected: '删除所选', keepOne: '至少保留一个日期选项', setAsDefault: '设为默认', currentDefault: '当前默认', messages: '消息', promptOptional: '提示（可选）', promptPlaceholder: '请输入属性提示', errorMessageOptional: '错误消息（可选）', errorPlaceholder: '请输入错误消息', moveUp: '上移', moveDown: '下移', delete: '删除', cancel: '取消', confirm: '确认', closeConfirm: '确定关闭吗？未保存的修改将丢失。', warning: '警告', yes: '是', no: '否', restoreConfirm: '确定恢复系统默认日期选项吗？', formError: '请检查表单内容',
} : {
  editTitle: 'Date selection', basicInformation: 'Basic information', title: 'Title', titleRequired: 'Enter a title', defaultValue: 'Default value', dateOptions: 'Date options', addOption: 'Add option', restoreDefaults: 'Restore system defaults', addDateOptions: 'Add date options', selectDateOptions: 'Select date formats to add', selectByLength: 'Select all by length', lengthOneTwo: '1–2 chars', lengthThreeFour: '3–4 chars', lengthFiveSix: '5–6 chars', lengthSevenPlus: '≥7 chars', selectAll: 'Select all', deleteSelected: 'Delete selected', keepOne: 'Keep at least one date option', setAsDefault: 'Set as default', currentDefault: 'Current default', messages: 'Messages', promptOptional: 'Prompt (optional)', promptPlaceholder: 'Enter a property prompt', errorMessageOptional: 'Error message (optional)', errorPlaceholder: 'Enter an error message', moveUp: 'Move up', moveDown: 'Move down', delete: 'Delete', cancel: 'Cancel', confirm: 'Confirm', closeConfirm: 'Close without saving your changes?', warning: 'Warning', yes: 'Yes', no: 'No', restoreConfirm: 'Restore the system date options?', formError: 'Please check the form',
})

const catalogDateOptions = computed(() => getCatalogDateFormatOptions(dataCatalogStore.options, designStore.appLanguage))
const selectedOptions = computed(() => selectedValues.value.map(value => catalogDateOptions.value.find(option => option.value === value)).filter((option): option is CatalogDateFormatOption => Boolean(option)))
const allOptionsSelected = computed({
  get: () => selectedValues.value.length > 0 && selectedForDeletion.value.length === selectedValues.value.length,
  set: (selected: boolean) => { selectedForDeletion.value = selected ? [...selectedValues.value] : [] },
})
const someOptionsSelected = computed(() => selectedForDeletion.value.length > 0 && !allOptionsSelected.value)
const addableOptions = computed(() => catalogDateOptions.value.filter(option => !selectedValues.value.includes(option.value)))
const lengthGroups = computed(() => [
  { value: 'oneTwo' as const, label: uiText.value.lengthOneTwo },
  { value: 'threeFour' as const, label: uiText.value.lengthThreeFour },
  { value: 'fiveSix' as const, label: uiText.value.lengthFiveSix },
  { value: 'sevenPlus' as const, label: uiText.value.lengthSevenPlus },
])
const optionLabel = (option: OptionFormat<number>) => designStore.appLanguage === 'zhs' ? (option.zhsLabel || option.label) : option.label
const setDefaultValue = (value: number) => { formData.defaultValue = value }
const nextKey = () => { let index = 1; while (propertiesStore.allProperties[`date_${index}`]) index += 1; return `date_${index}` }

const initFormData = (data: any = null) => {
  isEdit.value = Boolean(data?.propertyKey)
  const defaults = getCommonDateFormatterValues(designStore.appLanguage, dataCatalogStore.options)
  if (catalogDateOptions.value.length === 0) {
    ElMessage.error(dataCatalogStore.error || 'Date format catalog is unavailable')
    return
  }
  const propertyKey = data?.propertyKey || nextKey()
  Object.assign(formData, data ? {
    title: data.title, propertyKey, defaultValue: Number(data.value), prompt: data.prompt || '', errorMessage: data.errorMessage || '',
  } : {
    title: `Date ${propertyKey.slice(5)}`, propertyKey, defaultValue: defaults[0], prompt: '', errorMessage: '',
  })
  selectedValues.value = resolveDateFormatterValues(data?.options?.map((option: any) => option.value), designStore.appLanguage, dataCatalogStore.options)
  if (!selectedValues.value.includes(formData.defaultValue)) formData.defaultValue = selectedValues.value[0]
  activeOptions.value = []
  pendingOptionValues.value = []
  selectedForDeletion.value = []
}

const openAddOptions = () => { pendingOptionValues.value = []; addOptionsVisible.value = true }
const selectLengthGroup = (lengthBand: 'oneTwo' | 'threeFour' | 'fiveSix' | 'sevenPlus') => {
  const pending = new Set(pendingOptionValues.value)
  addableOptions.value
    .filter((option) => {
      const length = [...String(option.example || '')].length
      if (lengthBand === 'oneTwo') return length <= 2
      if (lengthBand === 'threeFour') return length >= 3 && length <= 4
      if (lengthBand === 'fiveSix') return length >= 5 && length <= 6
      return length >= 7
    })
    .forEach(option => pending.add(option.value))
  pendingOptionValues.value = [...pending]
}
const confirmAddOptions = () => {
  const selected = new Set(pendingOptionValues.value)
  selectedValues.value = [...selectedValues.value, ...addableOptions.value.filter(option => selected.has(option.value)).map(option => option.value)]
  pendingOptionValues.value = []
  addOptionsVisible.value = false
}
const deleteOption = (index: number) => {
  if (selectedValues.value.length <= 1) return
  const removed = selectedValues.value[index]
  selectedValues.value = selectedValues.value.filter((_, current) => current !== index)
  if (formData.defaultValue === removed) formData.defaultValue = selectedValues.value[0]
  selectedForDeletion.value = selectedForDeletion.value.filter(value => value !== removed)
}
const deleteSelectedOptions = () => {
  const removing = new Set(selectedForDeletion.value)
  const remaining = selectedValues.value.filter(value => !removing.has(value))
  if (remaining.length === 0) {
    ElMessage.warning(uiText.value.keepOne)
    return
  }
  selectedValues.value = remaining
  if (!remaining.includes(formData.defaultValue)) formData.defaultValue = remaining[0]
  selectedForDeletion.value = []
}
const moveOption = (index: number, direction: 'up' | 'down') => {
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= selectedValues.value.length) return
  const values = [...selectedValues.value]
  ;[values[index], values[target]] = [values[target], values[index]]
  selectedValues.value = values
}
const restoreSystemDefaults = async () => {
  try {
    await ElMessageBox.confirm(uiText.value.restoreConfirm, uiText.value.restoreDefaults, { confirmButtonText: uiText.value.yes, cancelButtonText: uiText.value.no, type: 'warning' })
    selectedValues.value = getCommonDateFormatterValues(designStore.appLanguage, dataCatalogStore.options)
    if (!selectedValues.value.includes(formData.defaultValue)) formData.defaultValue = selectedValues.value[0]
  } catch { /* Keep current options. */ }
}
const handleConfirm = async () => {
  try {
    await formRef.value?.validate?.()
    emit('confirm', {
      type: 'date', key: formData.propertyKey, title: formData.title, defaultValue: formData.defaultValue,
      options: selectedOptions.value.map(option => ({ label: option.label, labelCn: option.zhsLabel, value: option.value })), prompt: formData.prompt, errorMessage: formData.errorMessage, isEdit: isEdit.value,
    })
    dialogVisible.value = false
  } catch { ElMessage.error(uiText.value.formError) }
}
const handleClose = () => {
  ElMessageBox.confirm(uiText.value.closeConfirm, uiText.value.warning, { confirmButtonText: uiText.value.yes, cancelButtonText: uiText.value.no, type: 'warning' })
    .then(() => { dialogVisible.value = false })
    .catch(() => {})
}

defineExpose({ show: (data: any = null) => { initFormData(data); dialogVisible.value = true } })
</script>

<style scoped>
.section-actions { display: flex; align-items: center; }
.option-batch-actions { display: flex; align-items: center; justify-content: space-between; min-height: 36px; }
.date-length-actions { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.date-length-label { margin-right: auto; color: var(--el-text-color-secondary); font-size: 13px; }
.date-option-content { display: grid; grid-template-columns: minmax(0, 160px) minmax(88px, 1fr); align-items: center; gap: 12px; }
.default-option-content { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.default-option-example { color: var(--el-text-color-secondary); font-size: 12px; }
.option-label { overflow: hidden; color: var(--el-text-color-primary); text-overflow: ellipsis; white-space: nowrap; }
.option-example { justify-self: start; color: var(--el-text-color-secondary); font-size: 12px; white-space: nowrap; }
</style>
