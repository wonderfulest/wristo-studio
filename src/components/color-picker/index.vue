<template>
  <div class="color-picker-wrapper" @click.stop>
    <div class="color-input" @click="togglePicker">
      <input
        :value="modelValue === 'transparent' ? 'transparent' : modelValue"
        readonly
        :class="{ 'transparent-input': modelValue === 'transparent' }"
        :style="{
          backgroundColor: modelValue === 'transparent' ? 'transparent' : modelValue
        }" />
    </div>
    <div v-if="isOpen" class="color-picker">
      <div class="tabs">
        <div class="tab" :class="{ active: true }">纯色</div>
      </div>
      <!-- 颜色矩阵 -->
      <div class="color-matrix">
        <div v-for="color in colorMatrix" :key="color" class="color-cell" :style="{ backgroundColor: color }" @click="selectColor({hex: color, value: color})"></div>
      </div>

      <!-- 当前使用的颜色 -->
      <div v-if="colorProperties.length > 0" class="recent-colors">
        <div class="recent-colors-header">
          <div class="recent-colors-title">当前设置的颜色</div>
          <button class="toggle-list-btn" @click="toggleColorList">
            {{ showColorList ? '收起' : '展开' }}
          </button>
        </div>
        <div v-if="!showColorList" class="recent-colors-grid">
          <div v-for="colorProperty in colorProperties" :key="colorProperty.name" class="recent-color" :style="{ backgroundColor: colorProperty.hex }" @click="selectColor(colorProperty)"></div>
        </div>
        <div v-else class="color-variables-list">
          <div v-for="colorProperty in colorProperties" :key="colorProperty.name" class="color-variable-item">
            <div class="color-preview-small" :style="{ backgroundColor: colorProperty.hex }" @click.stop="selectColor(colorProperty)"></div>
            <div class="color-variable-info">
              <div class="color-hex">{{ colorProperty.hex }}</div>
              <div class="color-name">{{ colorProperty.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'

const props = defineProps({
  modelValue: {
    type: String,
    default: '#000000'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()

// 颜色矩阵
const colorMatrix = [
  '#000000',
  '#000055',
  '#0000AA',
  '#0000FF',
  '#005500',
  '#005555',
  '#0055AA',
  '#0055FF',
  '#00AA00',
  '#00AA55',
  '#00AAAA',
  '#00AAFF',
  '#00FF00',
  '#00FF55',
  '#00FFAA',
  '#00FFFF',
  '#550000',
  '#550055',
  '#5500AA',
  '#5500FF',
  '#555500',
  '#555555',
  '#5555AA',
  '#5555FF',
  '#55AA00',
  '#55AA55',
  '#55AAAA',
  '#55AAFF',
  '#55FF00',
  '#55FF55',
  '#55FFAA',
  '#55FFFF',
  '#AA0000',
  '#AA0055',
  '#AA00AA',
  '#AA00FF',
  '#AA5500',
  '#AA5555',
  '#AA55AA',
  '#AA55FF',
  '#AAAA00',
  '#AAAA55',
  '#AAAAAA',
  '#AAAAFF',
  '#AAFF00',
  '#AAFF55',
  '#AAFFAA',
  '#AAFFFF',
  '#FF0000',
  '#FF0055',
  '#FF00AA',
  '#FF00FF',
  '#FF5500',
  '#FF5555',
  '#FF55AA',
  '#FF55FF',
  '#FFAA00',
  '#FFAA55',
  '#FFAAAA',
  '#FFAAFF',
  '#FFFF00',
  '#FFFF55',
  '#FFFFAA',
  '#FFFFFF',
  'transparent'
]

// 状态
const isOpen = ref(false)
const hexColor = ref(props.modelValue)

// 获取当前使用的颜色
const colorVariables = computed(() => baseStore.getAllColors())
const showColorList = ref(false)

// 计算属性：获取所有颜色属性
const colorProperties = computed(() => {
  return Object.entries(propertiesStore.properties || {})
    .filter(([_, prop]) => prop.type === 'color')
    .map(([key, prop]) => ({
      name: prop.title,
      hex: `#${prop.value.replace('0x', '')}`,
      value: prop.value,
      propertyKey: key
    }))
})

// 切换颜色列表展开/收起
const toggleColorList = () => {
  showColorList.value = !showColorList.value
}

// 选择颜色
const selectColor = (color) => {
  hexColor.value = color.hex
  emit('update:modelValue', color.hex)
  emit('change', color.hex)
}

// 更新颜色
const updateColor = () => {
  emit('update:modelValue', hexColor.value)
  emit('change', hexColor.value)
}

// 从十六进制更新
const updateFromHex = () => {
  if (hexColor.value.startsWith('#')) {
    emit('update:modelValue', `0x${hexColor.value.slice(1)}`)
  }
}

// 工具函数
const isValidHex = (hex) => /^#[0-9A-F]{6}$/i.test(hex)
  
// 监听点击外部关闭
const handleOutsideClick = (event) => {
  if (!event.target.closest('.color-picker-wrapper')) {
    isOpen.value = false
  }
}

// 添加和移除事件监听
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== hexColor.value) {
      hexColor.value = newValue === 'transparent' ? '#000000' : newValue
    }
  }
)

const togglePicker = () => {
  isOpen.value = true
}
</script>

<style scoped>
.color-picker-wrapper {
  position: relative;
  width: 100%;
}

.color-input {
  width: 100%;
}

.color-input input {
  width: 100%;
  height: 32px;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  color: #666;
}

.color-input input.transparent-input {
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0px;
}

.color-input input.transparent-input::after {
  content: '×';
  display: inline-block;
  color: #ff4d4f;
  font-weight: bold;
  margin-left: 4px;
}

.color-input input:hover {
  border-color: #409eff;
}

.color-picker {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 1000;
  width: 300px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.tabs {
  display: flex;
  margin-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.tab {
  padding: 6px 12px;
  cursor: pointer;
  color: #666;
  font-size: 13px;
}

.tab.active {
  color: #333;
  border-bottom: 2px solid #409eff;
}

.color-matrix {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  margin-bottom: 8px;
}

.color-cell {
  aspect-ratio: 1;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid #eee;
  transition: transform 0.2s;
  position: relative;
}

.color-cell[style*='transparent'] {
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0px;
}

.color-cell[style*='transparent']::after {
  content: '×';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ff4d4f;
  font-size: 16px;
  font-weight: bold;
}

.color-cell:hover {
  transform: scale(1.1);
  z-index: 1;
  border-color: #409eff;
}

.color-info {
  display: flex;
  align-items: center;
  margin: 12px 0;
}

.color-preview {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  margin-right: 8px;
  border: 1px solid #ddd;
}

.color-inputs {
  flex: 1;
  display: flex;
  align-items: center;
}

.var-name-input {
  width: 80px;
  margin-left: 8px;
}

.save-variable-btn {
  padding: 4px 8px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 8px;
}

.save-variable-btn:hover {
  background-color: #66b1ff;
}

.recent-colors {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.recent-colors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.recent-colors-title {
  font-size: 12px;
  color: #666;
}

.toggle-list-btn {
  padding: 2px 8px;
  font-size: 12px;
  color: #666;
  background-color: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.toggle-list-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.color-variables-list {
  max-height: 200px;
  overflow-y: auto;
}

.color-variable-item {
  display: flex;
  align-items: center;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.color-variable-item:hover {
  background-color: #f5f7fa;
}

.color-preview-small {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 8px;
  border: 1px solid #ddd;
}

.color-variable-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.delete-btn {
  padding: 2px 6px;
  background: none;
  border: none;
  color: #909399;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.delete-btn:hover {
  color: #f56c6c;
  background: #fef0f0;
}

.color-hex {
  font-size: 12px;
  color: #666;
}

.color-name {
  font-size: 12px;
  color: #409eff;
  cursor: text;
  padding: 2px 4px;
  border-radius: 4px;
}

.color-name:hover {
  background-color: #f0f7ff;
}

.color-name.editing {
  background-color: #fff;
}

.name-input {
  width: 100%;
  border: 1px solid #409eff;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
  color: #409eff;
  outline: none;
  background: transparent;
}

.name-input:focus {
  border-color: #66b1ff;
}

.recent-colors-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.recent-color {
  aspect-ratio: 1;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid #eee;
  transition: transform 0.2s;
}

.recent-color:hover {
  transform: scale(1.1);
  z-index: 1;
  border-color: #409eff;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
