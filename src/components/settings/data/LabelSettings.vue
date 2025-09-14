<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
    >
      <el-form-item label="数据属性" v-if="element.dataProperty" prop="dataProperty" :rules="[{ required: true, message: '请选择数据属性', trigger: 'change' }]">
        <el-select 
          v-model="element.dataProperty" 
          @change="updateElement"
          placeholder="选择数据属性"
        >
          <el-option 
            v-for="[key, prop] in Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'data')" 
            :key="key" 
            :label="prop.title" 
            :value="key" 
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目标属性" v-if="element.goalProperty" prop="goalProperty" :rules="[{ required: true, message: '请选择目标属性', trigger: 'change' }]">
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

      <el-form-item label="位置">
        <PositionInputs 
          :left="element.left"
          :top="element.top"
          @update:left="(v)=> element.left = v"
          @update:top="(v)=> element.top = v"
          @change="updateElement"
        />
      </el-form-item>

      <el-form-item label="对齐方式">
        <AlignXButtons 
          :options="originXOptions" 
          v-model="element.originX"
          @update:modelValue="updateElement"
        />
      </el-form-item>

      <el-form-item label="字体大小">
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

      <el-form-item label="字体颜色">
        <color-picker 
          v-model="element.fill" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="字体">
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
import { useLabelStore } from '@/stores/elements/data/labelElement'
import { fontSizes, originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import PositionInputs from '@/components/settings/common/PositionInputs.vue'
import AlignXButtons from '@/components/settings/common/AlignXButtons.vue'
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
const labelStore = useLabelStore()
const propertiesStore = usePropertiesStore()

const updateElement = async () => {
  try {
    await formRef.value.validate()
    labelStore.updateElement(props.element, {
      dataProperty: props.element.dataProperty,
      fontSize: props.element.fontSize,
      fill: props.element.fill,
      fontFamily: props.element.fontFamily,
      originX: props.element.originX,
      left: props.element.left,
      top: props.element.top
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
@import '@/assets/styles/settings.css';
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
