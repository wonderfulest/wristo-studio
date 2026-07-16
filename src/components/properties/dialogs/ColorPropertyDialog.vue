<template>
  <el-dialog v-model="dialogVisible" class="property-dialog" :title="t('property.colorSelect')" width="720px" :close-on-click-modal="false" :destroy-on-close="true">
    <el-form ref="formRef" :model="formData" label-position="top" class="property-form">
      <div class="property-hero">
        <div>
          <div class="property-hero-kicker">{{ t('property.colorSelect') }}</div>
          <div class="property-hero-title">{{ formData.title || t('property.colorSelect') }}</div>
        </div>
        <code class="property-hero-key">prop.{{ formData.propertyKey || 'color_1' }}</code>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ t('property.basicInformation') }}</h3>
        <div class="basic-grid">
          <el-form-item
            :label="t('property.title')"
            prop="title"
            :rules="[
              { required: true, message: t('property.inputTitle'), trigger: 'blur' },
              { min: 2, max: 50, message: t('property.titleLength'), trigger: 'blur' }
            ]">
            <el-input v-model="formData.title" :placeholder="t('property.colorSelect')" />
          </el-form-item>

          <PropertyKeyField v-model="formData.propertyKey" :is-edit="isEdit" default-key="color_1" placeholder="color_1" />
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">{{ t('property.colorOptions') }}</h3>
        </div>
        <el-form-item
          :label="t('property.defaultValue')"
          prop="value"
          :rules="[
            { required: true, message: t('property.defaultValueRequired'), trigger: 'change' },
            { validator: validateDefaultValue, trigger: 'change' }
          ]">
          <ColorPicker
            v-model="defaultColorHex"
            :canvas-colors="canvasColors"
            @change="handleDefaultColorChange" />
        </el-form-item>

        <div class="property-preview-panel">
          <div class="property-preview-main">
            <div class="property-preview-label">{{ t('property.defaultValue') }}</div>
            <div class="property-preview-value">
              <span
                class="color-preview"
                :style="{
                  backgroundColor: formData.value === '-1' ? 'transparent' : `#${String(formData.value).replace('0x', '')}`,
                  border: formData.value === '-1' ? '1px dashed var(--el-border-color)' : '1px solid var(--el-border-color-lighter)'
                }">
                <span v-if="formData.value === '-1'" class="transparent-pattern"></span>
              </span>
              <span>{{ selectedColorLabel }}</span>
            </div>
          </div>
          <code class="property-preview-meta">{{ formData.value }}</code>
        </div>

        <el-collapse v-model="activeOptions" class="options-collapse">
          <el-collapse-item :title="t('property.colorOptions')" name="options">
            <el-form-item
              prop="options"
              :rules="[
                { required: true, message: t('property.atLeastOneOption'), trigger: 'change' },
                { validator: validateOptions, trigger: 'change' }
              ]">
              <div class="options-list">
                <div v-for="option in formData.options" :key="`${option.label}-${option.value}`" class="option-item">
                  <div class="option-content color-option-content">
                    <span class="color-preview" :style="getOptionPreviewStyle(option.value)">
                      <span v-if="option.value === '-1'" class="transparent-pattern"></span>
                    </span>
                    <span class="option-label">{{ option.label }}</span>
                    <code class="option-value">{{ option.value }}</code>
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ t('property.messages') }}</h3>
        <div class="message-grid">
          <el-form-item :label="t('property.promptOptional')">
            <el-input v-model="formData.prompt" type="textarea" :rows="3" resize="none" :placeholder="t('property.promptPlaceholder')" />
          </el-form-item>

          <el-form-item :label="t('property.errorMessageOptional')">
            <el-input v-model="formData.errorMessage" type="textarea" :rows="3" resize="none" :placeholder="t('property.errorPlaceholder')" />
          </el-form-item>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleConfirm">{{ t('common.confirm') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { useI18n } from '@/i18n'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import { buildColorPropertyOptions, normalizeRgb565GarminColor } from './colorPropertyOptions'
import { collectCanvasColors } from './canvasColorPalette'

const { t } = useI18n()
const dialogVisible = ref(false)
const formRef = ref(null)
const activeOptions = ref([])
const propertiesStore = usePropertiesStore()
const elementDataStore = useElementDataStore()
const isEdit = ref(false)

const canvasColors = computed(() => collectCanvasColors(elementDataStore.elements))

const defaultColorHex = ref('#ffffff')

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'color',
  options: [],
  value: '0xffffff',
  prompt: '',
  errorMessage: ''
})

const selectedColorLabel = computed(() => {
  const selected = formData.options.find((option) => String(option.value || '').toUpperCase() === String(formData.value || '').toUpperCase())
  return selected?.label || t('common.noData')
})

const getNextColorPropertyDefaults = () => {
  let maxIndex = 0
  Object.keys(propertiesStore.allProperties || {}).forEach((key) => {
    const match = key.match(/^color_(\d+)$/)
    if (match) maxIndex = Math.max(maxIndex, Number(match[1]) || 0)
  })
  const index = maxIndex + 1
  return {
    index,
    key: `color_${index}`,
    title: `Color ${index}`
  }
}

// 表单验证规则
const validateOptions = (rule, value, callback) => {
  const expected = buildColorPropertyOptions(formData.value, propertiesStore.getDefaultColorOptions)
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    callback(new Error(t('property.validLabelColorRequired')))
  } else {
    callback()
  }
}

const validateDefaultValue = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('property.defaultValueRequired')))
    return
  }
  if (value !== normalizeRgb565GarminColor(value)) {
    callback(new Error(t('property.defaultValueInColorOptions')))
    return
  }
  callback()
}

const garminToHex = (value) => {
  const normalized = normalizeRgb565GarminColor(value)
  return `#${normalized.slice(2)}`
}

const syncDefaultColor = (value) => {
  const normalized = normalizeRgb565GarminColor(value)
  formData.value = normalized
  defaultColorHex.value = garminToHex(normalized)
  formData.options = buildColorPropertyOptions(normalized, propertiesStore.getDefaultColorOptions)
}

const handleDefaultColorChange = (hex) => {
  syncDefaultColor(hex)
}

const initFormData = (data = null) => {
  isEdit.value = !!data
  if (data) {
    Object.assign(formData, {
      title: data.title,
      propertyKey: data.propertyKey,
      type: data.type,
      options: JSON.parse(JSON.stringify(data.options)),
      value: data.value || data.options[0]?.value || '0xffffff',
      prompt: data.prompt,
      errorMessage: data.errorMessage
    })
  } else {
    const defaults = getNextColorPropertyDefaults()
    const defaultValue = propertiesStore.lastSelectedColor || '0xffffff'
    Object.assign(formData, {
      title: defaults.title,
      propertyKey: defaults.key,
      type: 'color',
      options: [],
      value: defaultValue,
      prompt: '',
      errorMessage: ''
    })
  }

  syncDefaultColor(formData.value)
}

const getOptionPreviewStyle = (value) => ({
  backgroundColor: value === '-1' ? 'transparent' : `#${String(value).replace('0x', '')}`,
  border: value === '-1' ? '1px dashed var(--el-border-color)' : 'none'
})

const emit = defineEmits(['confirm'])

const handleConfirm = async () => {
  if (!formRef.value) return

  try {
    syncDefaultColor(formData.value)
    await formRef.value.validate()
    emit('confirm', {
      type: 'color',
      key: formData.propertyKey,
      title: formData.title,
      options: formData.options,
      defaultValue: formData.value,
      prompt: formData.prompt,
      errorMessage: formData.errorMessage,
      isEdit: isEdit.value
    })
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(t('property.formError'))
  }
}

const handleClose = () => {
  ElMessageBox.confirm(t('property.closeConfirm'), t('property.warning'), {
    confirmButtonText: t('common.yes'),
    cancelButtonText: t('common.no'),
    type: 'warning'
  })
    .then(() => {
      dialogVisible.value = false
    })
    .catch(() => {})
}

defineExpose({
  show: (data = null) => {
    initFormData(data)
    dialogVisible.value = true
  }
})
</script>

<style scoped>
.color-option-content {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.color-option-content .color-preview {
  display: block;
}

.option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-value {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
