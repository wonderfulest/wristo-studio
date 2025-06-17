<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="element" 
      label-position="left" 
      label-width="100px"
      :rules="rules"
    >
      <el-form-item label="数据属性" v-if="!element.goalProperty" prop="dataProperty" :rules="[{ required: true, message: '请选择数据属性', trigger: 'change' }]">
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

      <el-form-item label="目标属性" v-if="element.goalProperty">
        <el-select v-model="element.goalProperty" @change="updateElement">
          <el-option v-for="prop in Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'goal')"
            :key="prop[0]" :label="prop[1].title" :value="prop[0]" />
        </el-select>
      </el-form-item>
      <el-form-item label="位置">
        <div class="position-inputs">
          <el-input-number 
            v-model="element.left" 
            @change="updateElement"
            placeholder="X"
          />
          <el-input-number 
            v-model="element.top" 
            @change="updateElement"
            placeholder="Y"
          />
        </div>
      </el-form-item>

      <el-form-item label="对齐方式">
        <el-select 
          v-model="element.originX" 
          @change="updateElement"
        >
          <el-option 
            v-for="align in originXOptions" 
            :key="align.value" 
            :label="align.label" 
            :value="align.value" 
          />
        </el-select>
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
import { useIconStore } from '@/stores/elements/data/iconElement'
import { fontSizes, originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/index.vue'
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
const iconStore = useIconStore()
const propertiesStore = usePropertiesStore()

const rules = {
  dataProperty: [
    { required: true, message: '请选择数据属性', trigger: 'change' }
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

.position-inputs {
  display: flex;
  gap: 8px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
