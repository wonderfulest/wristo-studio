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

        <el-form-item 
          label="Property Key" 
          prop="propertyKey"
          :rules="[
            { required: true, message: 'Please input property key', trigger: 'blur' },
            { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Only letters, numbers and underscore allowed, must start with letter', trigger: 'blur' }
          ]"
        >
          <el-input 
            v-model="formData.propertyKey" 
            placeholder="data_1" 
            :disabled="isEdit"
          />
          <div class="field-help">
            The key of the property that this setting will manage. Letter, under score, and number only, no space and special characters allow. To access this property value in your design, use <code class="code-text">(prop.{{ formData.propertyKey || 'propertykey' }})</code> in the expression.
          </div>
        </el-form-item>

        <el-form-item label="Type">
          <el-input v-model="formData.type" disabled placeholder="data" />
          <div class="field-help">
            The display type of the setting.
          </div>
        </el-form-item>
      </div>

      <!-- 选项部分 -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">Data Options</h3>
        </div>
        <el-form-item 
          label="Default Value"
          prop="value"
        >
          <el-select 
            v-model="formData.value" 
            placeholder="Select data type"
            style="width: 100%"
            @change="handleValueChange"
          >
            <el-option
              v-for="option in formData.options"
              :key="option.value"
              :label="option.label + ' (' + option.metricSymbol + ')'"
              :value="option.value"
            >
              <div class="metric-option">
                <span class="metric-icon">{{ option.icon }}</span>
                <span class="metric-label">{{ option.label }} ({{ option.metricSymbol }})</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-collapse v-model="activeOptions" class="options-collapse">
          <el-collapse-item title="Data Options" name="options">
            <el-form-item 
              prop="options"
              :rules="[
                { required: true, message: 'At least one option is required', trigger: 'change' }
              ]"
            >
              <div class="options-list">
                <div v-for="(option, index) in formData.options" :key="index" class="option-item">
                  <div class="option-content">
                    <div class="option-info">
                      <span class="metric-icon">{{ option.icon }}</span>
                      <span class="metric-label">{{ option.label }}</span>
                      <span class="metric-symbol">({{ option.metricSymbol }})</span>
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
import { ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { DataTypeOptions } from '@/config/settings'

const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const activeOptions = ref([])
const dataOptions = DataTypeOptions.filter(option => option.metricSymbol.startsWith(':FIELD_TYPE_'))

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'data',
  options: dataOptions,
  value: dataOptions[0]?.value,
  prompt: '',
  errorMessage: ''
})

const initFormData = (data = null) => {
  isEdit.value = !!data
  if (data) {
    Object.assign(formData, {
      title: data.title,
      propertyKey: data.propertyKey,
      type: data.type,
      options: dataOptions,
      value: data.value || dataOptions[0]?.value,
      prompt: data.prompt,
      errorMessage: data.errorMessage
    })
  } else {
    Object.assign(formData, {
      title: 'Data 1',
      propertyKey: 'data_1',
      type: 'data',
      options: dataOptions,
      value: dataOptions[0]?.value,
      prompt: '',
      errorMessage: ''
    })
  }
}

const emit = defineEmits(['confirm'])

const handleValueChange = (value) => {
  
}

const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    const selectedOption = formData.options.find(opt => opt.value === formData.value)
    if (!selectedOption) {
      ElMessage.error('Please select a valid option')
      return
    }
    emit('confirm', {
      type: 'data',
      key: formData.propertyKey,
      title: formData.title,
      options: formData.options,
      defaultValue: selectedOption.value,
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

defineExpose({
  show: (data = null) => {
    initFormData(data)
    dialogVisible.value = true
  }
})
</script>

<style scoped>
.metric-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  width: 100%;
}

.metric-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
}

.metric-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.metric-symbol {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 4px;
}
</style> 