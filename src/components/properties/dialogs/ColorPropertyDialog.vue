<template>
  <el-dialog
    v-model="dialogVisible"
    class="property-dialog"
    :title="t('property.colorSelect')"
    width="720px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
  >
    <el-form 
      ref="formRef"
      :model="formData"
      label-position="top"
      class="property-form"
    >
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
            ]"
          >
            <el-input v-model="formData.title" :placeholder="t('property.colorSelect')" />
          </el-form-item>

          <PropertyKeyField
            v-model="formData.propertyKey"
            :is-edit="isEdit"
            default-key="color_1"
            placeholder="color_1"
          />
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">{{ t('property.colorOptions') }}</h3>
          <el-button type="primary" plain @click="addOption">
            <el-icon><Plus /></el-icon>
            {{ t('property.addOption') }}
          </el-button>
        </div>
        <el-form-item 
          :label="t('property.defaultValue')"
          prop="value"
          :rules="[
            { required: true, message: t('property.defaultValueRequired'), trigger: 'change' },
            { validator: validateDefaultValue, trigger: 'change' }
          ]"
        >
          <ColorPicker v-model="defaultColorHex" @change="handleDefaultColorChange" />
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
                }"
              >
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
              ]"
            >
              <div class="options-list">
                <div v-for="(option, index) in formData.options" :key="index" class="option-item">
                  <div class="option-content">
                    <div class="option-inputs">
                      <el-input v-model="option.label" :placeholder="t('property.optionLabel')">
                        <template #prefix>
                          <div 
                            class="color-preview" 
                            :style="{ 
                              backgroundColor: option.value === '-1' ? 'transparent' : `#${option.value.replace('0x', '')}`,
                              border: option.value === '-1' ? '1px dashed var(--el-border-color)' : 'none'
                            }"
                          >
                            <div v-if="option.value === '-1'" class="transparent-pattern"></div>
                          </div>
                        </template>
                      </el-input>
                      <el-input 
                        v-model="option.value" 
                        :placeholder="t('property.colorValue')"
                        :class="{ 'is-invalid': !isValidColorValue(option.value) }"
                      />
                    </div>
                  </div>
                  <div class="option-actions">
                    <el-tooltip :content="t('common.moveUp')" placement="top" :disabled="index === 0">
                      <el-button type="primary" link :disabled="index === 0" @click="moveOption(index, 'up')">
                        <el-icon><ArrowUp /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip :content="t('common.moveDown')" placement="top" :disabled="index === formData.options.length - 1">
                      <el-button type="primary" link :disabled="index === formData.options.length - 1" @click="moveOption(index, 'down')">
                        <el-icon><ArrowDown /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip :content="t('common.delete')" placement="top">
                      <el-button type="danger" link @click="deleteOption(index)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </el-tooltip>
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
            <el-input
              v-model="formData.prompt"
              type="textarea"
              :rows="3"
              resize="none"
              :placeholder="t('property.promptPlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="t('property.errorMessageOptional')">
            <el-input
              v-model="formData.errorMessage"
              type="textarea"
              :rows="3"
              resize="none"
              :placeholder="t('property.errorPlaceholder')"
            />
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
import { computed, ref, reactive, nextTick } from 'vue'
import { ArrowUp, ArrowDown, Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePropertiesStore } from '@/stores/properties'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { useI18n } from '@/i18n'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import ColorPicker from '@/components/color-picker/index.vue'

const { t } = useI18n()
const dialogVisible = ref(false)
const formRef = ref(null)
const activeOptions = ref([])
const propertiesStore = usePropertiesStore()
const isEdit = ref(false)

const defaultColorHex = ref('#ffffff')
const suppressDefaultChange = ref(false)

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

// 表单验证规则
const validateOptions = (rule, value, callback) => {
  if (!value || value.length === 0) {
    callback(new Error(t('property.atLeastOneOption')))
  } else if (!value.every(option => option.label && propertiesStore.isValidColorValue(option.value))) {
    callback(new Error(t('property.validLabelColorRequired')))
  } else {
    callback()
  }
}

const isValidColorValue = (value) => {
  if (value === '-1') return true // 支持透明色
  return /^0x[0-9A-Fa-f]{6}$/.test(value)
}

const isValueInOptions = (garminValue) => {
  return formData.options.some((opt) => String(opt.value || '').toUpperCase() === String(garminValue || '').toUpperCase())
}

const validateDefaultValue = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('property.defaultValueRequired')))
    return
  }
  if (!isValueInOptions(value)) {
    callback(new Error(t('property.defaultValueInColorOptions')))
    return
  }
  callback()
}

const garminToHex = (value) => {
  if (value === '-1') return 'transparent'
  if (!value) return '#ffffff'
  const v = typeof value === 'string' ? value : String(value)
  if (v.startsWith('0x') && v.length === 8) {
    return `#${v.slice(2)}`
  }
  if (v.startsWith('#') && v.length === 7) {
    return v
  }
  return '#ffffff'
}

const hexToGarmin = (hex) => {
  if (hex === 'transparent') return '-1'
  if (!hex) return '0xffffff'
  const h = typeof hex === 'string' ? hex : String(hex)
  const normalized = h.startsWith('#') ? h.slice(1) : (h.startsWith('0x') ? h.slice(2) : h)
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return '0xffffff'
  return `0x${normalized.toLowerCase()}`
}

const handleDefaultColorChange = async (hex) => {
  if (suppressDefaultChange.value) return

  const garminValue = hexToGarmin(hex)
  if (!isValueInOptions(garminValue)) {
    ElMessage.warning(t('property.chooseColorFromOptions'))
    suppressDefaultChange.value = true
    defaultColorHex.value = garminToHex(formData.value)
    await nextTick()
    suppressDefaultChange.value = false
    return
  }

  formData.value = garminValue
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
    Object.assign(formData, {
      title: 'Color 1',
      propertyKey: 'color_1',
      type: 'color',
      options: JSON.parse(JSON.stringify(propertiesStore.getDefaultColorOptions)),
      value: '0xffffff',
      prompt: '',
      errorMessage: ''
    })
  }

  if (!isValueInOptions(formData.value)) {
    formData.value = formData.options[0]?.value || '0xffffff'
  }

  defaultColorHex.value = garminToHex(formData.value)
}

const addOption = () => {
  formData.options.push({
    label: '',
    value: '0x000000'
  })
}

const deleteOption = (index) => {
  formData.options.splice(index, 1)
}

const moveOption = (index, direction) => {
  if (direction === 'up' && index > 0) {
    const temp = formData.options[index]
    formData.options[index] = formData.options[index - 1]
    formData.options[index - 1] = temp
  } else if (direction === 'down' && index < formData.options.length - 1) {
    const temp = formData.options[index]
    formData.options[index] = formData.options[index + 1]
    formData.options[index + 1] = temp
  }
}

const emit = defineEmits(['confirm'])

const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
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
  ElMessageBox.confirm(
    t('property.closeConfirm'),
    t('property.warning'),
    {
      confirmButtonText: t('common.yes'),
      cancelButtonText: t('common.no'),
      type: 'warning',
    }
  ).then(() => {
    dialogVisible.value = false
  }).catch(() => {})
}

defineExpose({
  show: (data = null) => {
    initFormData(data)
    dialogVisible.value = true
  }
})
</script>
