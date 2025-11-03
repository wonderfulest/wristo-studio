<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
      :rules="rules"
    >
      <DataPropertyField
        v-if="!element.goalProperty"
        v-model="element.dataProperty"
        @change="updateElement"
      />
      <GoalPropertyField
        v-if="element.goalProperty"
        v-model="element.goalProperty"
        @change="updateElement"
      />
      <el-form-item label="Position">
        <PositionInputs 
          :left="element.left"
          :top="element.top"
          @update:left="(v)=> element.left = v"
          @update:top="(v)=> element.top = v"
          @change="updateElement"
        />
      </el-form-item>

      <el-form-item label="Alignment">
        <AlignXButtons 
          :options="originXOptions" 
          v-model="element.originX"
          @update:modelValue="updateElement"
        />
      </el-form-item>

      <el-form-item label="Font Size">
        <el-select 
          v-model="element.fontSize" 
          @change="updateElement"
        >
          <el-option 
            v-for="size in fontSizes" 
            :key="size" 
            :label="`${size}px`" 
            :value="size" 
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Text Color">
        <color-picker 
          v-model="element.fill" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="Font">
        <font-picker 
          v-model="element.fontFamily" 
          @change="updateElement" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, defineExpose } from 'vue'
import { useIconStore } from '@/stores/elements/data/iconElement'
import { fontSizes, originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/components/settings/common/AlignXButtons.vue'
import PositionInputs from '@/components/settings/common/PositionInputs.vue'
import { usePropertiesStore } from '@/stores/properties'
import { ElMessage } from 'element-plus'
import DataPropertyField from '@/components/settings/common/DataPropertyField.vue'
import GoalPropertyField from '@/components/settings/common/GoalPropertyField.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const formRef = ref(null)
const iconStore = useIconStore()
const propertiesStore = usePropertiesStore()

const rules = {
  dataProperty: [
    { required: true, message: 'Please select a data property', trigger: 'change' }
  ]
}

const updateElement = async () => {
  try {
    await formRef.value.validate()
    iconStore.updateElement(props.element, {
      dataProperty: props.element.dataProperty,
      fontSize: props.element.fontSize,
      fill: props.element.fill,
      fontFamily: props.element.fontFamily,
      originX: props.element.originX,
      left: props.element.left,
      top: props.element.top
    })
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

// 添加关闭时的验证方法
const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('Please complete the required fields first')
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

.position-inputs {
  display: flex;
  gap: 8px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
