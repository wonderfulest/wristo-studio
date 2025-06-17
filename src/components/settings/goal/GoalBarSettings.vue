<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
      :rules="rules"
    >
      <el-form-item label="目标属性" prop="goalProperty" :rules="[{ required: true, message: '请选择目标属性', trigger: 'change' }]">
        <el-select 
          v-model="element.goalProperty" 
          @change="updateElement"
          placeholder="选择目标属性"
        >
          <el-option 
            v-for="[key, prop] in Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'goal')" 
            :key="key" 
            :label="prop.title" 
            :value="key" 
          />
        </el-select>
      </el-form-item>
      <el-form-item label="宽度">
        <el-input-number 
          v-model="element.width" 
          :min="50" 
          :max="500" 
          @change="updateElement" 
        />
      </el-form-item>
      
      <el-form-item label="高度">
        <el-input-number 
          v-model="element.height" 
          :min="4" 
          :max="50" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="圆角">
        <el-input-number 
          v-model="element.borderRadius" 
          :min="0" 
          :max="25" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="内边距">
        <el-input-number 
          v-model="element.padding" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="对齐方式">
        <el-select 
          v-model="element.originX" 
          @change="updateElement"
        >
          <el-option label="居中" value="center" />
        </el-select>
      </el-form-item>

      <el-form-item label="进度">
        <el-slider 
          v-model="element.progress" 
          :min="0" 
          :max="1" 
          :step="0.01" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="进度颜色">
        <color-picker 
          v-model="element.color" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="背景颜色">
        <color-picker 
          v-model="element.bgColor" 
          @change="updateElement" 
        />
      </el-form-item>

      

      <el-form-item label="前景对齐">
        <el-select 
          v-model="element.progressAlign" 
          @change="updateElement"
        >
          <el-option label="左对齐" value="left" />
          <el-option label="右对齐" value="right" />
        </el-select>
      </el-form-item>

      <el-form-item label="边框宽度">
        <el-input-number 
          v-model="element.borderWidth" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="边框颜色">
        <color-picker 
          v-model="element.borderColor" 
          @change="updateElement" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, defineEmits, defineExpose } from 'vue'
import { useGoalBarStore } from '@/stores/elements/goal/goalBarElement'
import ColorPicker from '@/components/color-picker/index.vue'
import { DataTypeOptions } from '@/config/settings'
import { usePropertiesStore } from '@/stores/properties'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const formRef = ref(null)
const goalBarStore = useGoalBarStore()
const metricOptions = DataTypeOptions
const propertiesStore = usePropertiesStore()

const rules = {
  goalProperty: [
    { required: true, message: '请选择目标属性', trigger: 'change' }
  ]
}

const updateElement = async () => {
  try {
    await formRef.value.validate()
    goalBarStore.updateElement(props.element, {
      width: props.element.width,
      height: props.element.height,
      borderRadius: props.element.borderRadius,
      padding: props.element.padding,
      progressAlign: props.element.progressAlign,
      progress: props.element.progress,
      color: props.element.color,
      bgColor: props.element.bgColor,
      goalProperty: props.element.goalProperty,
      borderWidth: props.element.borderWidth,
      borderColor: props.element.borderColor
    })
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 添加关闭时的验证方法
const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('请先完成必填项设置')
  }
}

// 暴露方法给父组件
defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
.settings-section {
  padding: 16px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
