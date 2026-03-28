<template>
  <el-dialog
    v-model="dialogVisible"
    title="Select Property"
    width="800px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
  >
    <el-form 
      ref="formRef"
      :model="formData"
      label-position="top"
      class="property-form"
    >
      <!-- 基本信息部分 -->
      <div class="form-section">
        <h3 class="section-title">Basic Information</h3>
        <el-form-item 
          label="Title" 
          prop="title"
          :rules="[
            { required: true, message: 'Please input title', trigger: 'blur' },
            { min: 2, max: 50, message: 'Length should be 2 to 50', trigger: 'blur' }
          ]"
        >
          <el-input v-model="formData.title" placeholder="Select Property" />
          <div class="field-help">
            The title to display in Garmin Connect Mobile/Garmin Express when displaying the list of settings/value of the setting.
          </div>
        </el-form-item>

        <PropertyKeyField
          v-model="formData.propertyKey"
          :is-edit="isEdit"
          default-key="color_1"
          placeholder="color_1"
        />

        <el-form-item label="Type">
          <el-input v-model="formData.type" disabled placeholder="number" />
          <div class="field-help">
            The display type of the setting.
          </div>
        </el-form-item>
      </div>

      <!-- 选项部分 -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">Color Options</h3>
          <el-button type="primary" plain @click="addOption">
            <el-icon><Plus /></el-icon>
            Add Option
          </el-button>
        </div>
        <el-form-item 
          label="Default Value"
          prop="value"
        >
          <ColorPicker v-model="defaultColorHex" @change="handleDefaultColorChange" />
        </el-form-item>
        <el-collapse v-model="activeOptions" class="options-collapse">
          <el-collapse-item title="Color Options" name="options">
            <el-form-item 
              prop="options"
              :rules="[
                { required: true, message: 'At least one option is required', trigger: 'change' },
                { validator: validateOptions, trigger: 'change' }
              ]"
            >
              <div class="options-list">
                <div v-for="(option, index) in formData.options" :key="index" class="option-item">
                  <div class="option-content">
                    <div class="option-inputs">
                      <el-input v-model="option.label" placeholder="Option label">
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
                        placeholder="Color value (e.g. 0x00aa00)"
                        :class="{ 'is-invalid': !isValidColorValue(option.value) }"
                      />
                    </div>
                  </div>
                  <div class="option-actions">
                    <el-tooltip content="Move Up" placement="top" :disabled="index === 0">
                      <el-button type="primary" link :disabled="index === 0" @click="moveOption(index, 'up')">
                        <el-icon><ArrowUp /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="Move Down" placement="top" :disabled="index === formData.options.length - 1">
                      <el-button type="primary" link :disabled="index === formData.options.length - 1" @click="moveOption(index, 'down')">
                        <el-icon><ArrowDown /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="Delete" placement="top">
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

      <!-- 提示信息部分 -->
      <div class="form-section">
        <h3 class="section-title">Messages</h3>
        <el-form-item label="Prompt">
          <el-input 
            type="textarea" 
            v-model="formData.prompt" 
            :rows="2" 
            placeholder="The message to display when prompting the user to set the value."
          />
          <div class="field-help">
            The message to display when prompting the user to set the value.
          </div>
        </el-form-item>

        <el-form-item label="Error Message">
          <el-input 
            type="textarea" 
            v-model="formData.errorMessage" 
            :rows="2" 
            placeholder="An error message to display if the value isn't valid."
          />
          <div class="field-help">
            An error message to display if the value a user enters isn't valid based on the type, min, max and maxLength values.
          </div>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm">Confirm</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ArrowUp, ArrowDown, Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePropertiesStore } from '@/stores/properties'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import ColorPicker from '@/components/color-picker/index.vue'

const dialogVisible = ref(false)
const formRef = ref(null)
const activeOptions = ref([])
const propertiesStore = usePropertiesStore()
const isEdit = ref(false)

const defaultColorHex = ref('#ffffff')

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'number',
  options: [],
  value: '0xffffff',
  prompt: '',
  errorMessage: ''
})

// 表单验证规则
const validateOptions = (rule, value, callback) => {
  if (!value || value.length === 0) {
    callback(new Error('At least one option is required'))
  } else if (!value.every(option => option.label && propertiesStore.isValidColorValue(option.value))) {
    callback(new Error('All options must have valid label and color value'))
  } else {
    callback()
  }
}

const isValidColorValue = (value) => {
  if (value === '-1') return true // 支持透明色
  return /^0x[0-9A-Fa-f]{6}$/.test(value)
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

const ensureOptionExists = (garminValue) => {
  if (!formData.options.some((opt) => opt.value === garminValue)) {
    formData.options.push({
      label: garminValue === '-1' ? 'Transparent' : `Custom (${garminValue})`,
      value: garminValue,
    })
  }
}

const handleDefaultColorChange = (hex) => {
  const garminValue = hexToGarmin(hex)
  ensureOptionExists(garminValue)
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
      errorMessage: formData.errorMessage
    })
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error('Please check the form for errors')
  }
}

const handleClose = () => {
  ElMessageBox.confirm(
    'Are you sure to close this dialog? All changes will be lost.',
    'Warning',
    {
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
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
