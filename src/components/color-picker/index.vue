<template>
  <div class="color-picker-wrapper" @click.stop ref="wrapperRef">
    <div class="color-input" @click="togglePicker">
      <input
        v-model="inputValue"
        @keydown.enter.prevent="handleInputConfirm"
        @blur="handleInputConfirm"
        :class="{ 'transparent-input': modelValue === 'transparent' }"
        :style="{
          backgroundColor: modelValue === 'transparent' ? 'transparent' : modelValue,
          color: modelValue === 'transparent' ? 'var(--studio-text-muted)' : textColor
        }" />
    </div>
    <div v-if="isOpen" class="color-picker" :style="pickerStyle">
      <div class="tabs">
        <div class="tab" :class="{ active: true }">{{ t('colorPicker.solid') }}</div>
      </div>
      <!-- 颜色矩阵 -->
      <div class="color-matrix">
        <div v-for="color in colorMatrix" :key="color" class="color-cell" :style="{ backgroundColor: color }" @click="selectColor({hex: color, value: color})"></div>
      </div>

      <!-- 当前使用的颜色 -->
      <div v-if="colorProperties.length > 0" class="recent-colors">
        <div class="recent-colors-header">
          <div class="recent-colors-title">{{ t('colorPicker.currentColors') }}</div>
          <button class="toggle-list-btn" @click="toggleColorList">
            {{ showColorList ? t('common.collapse') : t('common.expand') }}
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
import emitter from '@/utils/eventBus.ts'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    // 兼容字符串和数字（有些元素用 -1 之类的数值占位）
    type: [String, Number],
    default: '#FFFFFF'
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
const wrapperRef = ref(null)
const pickerStyle = ref({})
// 为每个实例生成唯一标识，用于互斥控制
const instanceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
// 内部统一使用字符串表示颜色
const hexColor = ref(typeof props.modelValue === 'string' ? props.modelValue : String(props.modelValue))
const inputValue = ref(typeof props.modelValue === 'string' ? props.modelValue : String(props.modelValue))

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

// Helper: convert hex string to RGB
const hexToRgb = (hex) => {
  if (!hex) return null
  if (typeof hex !== 'string') {
    hex = String(hex)
  }
  const h = hex.startsWith('#') ? hex.slice(1) : (hex.startsWith('0x') ? hex.slice(2) : hex)
  if (h.length !== 6) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return { r, g, b }
}

// Dynamic text color for the input based on luminance of background color
const textColor = computed(() => {
  if (props.modelValue === 'transparent') return '#222222'
  const current = typeof props.modelValue === 'string' && props.modelValue
    ? (props.modelValue.startsWith('#') ? props.modelValue : (props.modelValue.startsWith('0x') ? `#${props.modelValue.slice(2)}` : hexColor.value))
    : hexColor.value
  const rgb = hexToRgb(current)
  if (!rgb) return '#222222'
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
  return luminance < 0.5 ? '#dddddd' : '#222222'
})

// 切换颜色列表展开/收起
const toggleColorList = () => {
  showColorList.value = !showColorList.value
}

// 选择颜色
const selectColor = (color) => {
  hexColor.value = color.hex
  inputValue.value = color.hex
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
  // 监听全局事件：有其他 color-picker 打开时，关闭当前
  emitter.on('color-picker-open', (id) => {
    if (id !== instanceId) {
      isOpen.value = false
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  emitter.off?.('color-picker-open')
})

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== hexColor.value) {
      const v = typeof newValue === 'string' ? newValue : String(newValue)
      hexColor.value = v === 'transparent' ? '#222222' : v
      // 同步输入框显示
      if (v === 'transparent') {
        inputValue.value = 'transparent'
      } else if (typeof v === 'string' && v.startsWith('0x') && v.length === 8) {
        inputValue.value = `#${v.slice(2)}`
      } else {
        inputValue.value = v
      }
    }
  }
)

// 规范化用户在输入框里输入的颜色字符串
const normalizeInputToHex = (raw) => {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null

  if (s.toLowerCase() === 'transparent') return 'transparent'

  // 支持 0xrrggbb / #rrggbb / rrggbb
  if (/^0x[0-9A-Fa-f]{6}$/.test(s)) {
    return `#${s.slice(2)}`
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s.toLowerCase()
  }
  if (/^[0-9A-Fa-f]{6}$/.test(s)) {
    return `#${s}`.toLowerCase()
  }
  return null
}

const handleInputConfirm = () => {
  const normalized = normalizeInputToHex(inputValue.value)
  if (!normalized) return

  // 透明色单独处理
  if (normalized === 'transparent') {
    hexColor.value = 'transparent'
    emit('update:modelValue', 'transparent')
    emit('change', 'transparent')
    inputValue.value = 'transparent'
    return
  }

  // 在预设矩阵中查找完全匹配
  const fromMatrix = colorMatrix.find((c) => c.toLowerCase() === normalized.toLowerCase())
  if (fromMatrix) {
    selectColor({ hex: fromMatrix, value: fromMatrix })
    inputValue.value = fromMatrix
    return
  }

  // 在当前属性颜色中查找完全匹配
  const fromProps = colorProperties.value.find((cp) => cp.hex.toLowerCase() === normalized.toLowerCase())
  if (fromProps) {
    selectColor(fromProps)
    inputValue.value = fromProps.hex
    return
  }

  // 若未命中任何选项，仍然按该 hex 作为当前颜色
  hexColor.value = normalized
  emit('update:modelValue', normalized)
  emit('change', normalized)
  inputValue.value = normalized
}

const togglePicker = () => {
  // 切换打开/关闭；当打开时，广播给其他实例进行关闭
  const willOpen = !isOpen.value
  isOpen.value = willOpen
  if (willOpen) {
    emitter.emit?.('color-picker-open', instanceId)
    nextTick(() => {
      const el = wrapperRef.value
      if (!el) return
      const rect = el.getBoundingClientRect()
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0
      const popupHeight = 320 // 近似高度：矩阵+标题+边距
      const popupWidth = 300

      // 计算默认向下展开的位置
      let top = rect.bottom + 4
      let left = rect.left

      // 如果下面空间不够，改为向上展开
      const spaceBelow = viewportHeight - rect.bottom
      if (spaceBelow < popupHeight && rect.top > popupHeight) {
        top = rect.top - popupHeight - 4
      }

      // 避免越出右侧边界
      if (left + popupWidth > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - popupWidth - 8)
      }

      pickerStyle.value = {
        position: 'fixed',
        top: top + 'px',
        left: left + 'px',
        zIndex: 10000
      }
    })
  }
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
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  color: var(--studio-text-muted);
  background-color: var(--studio-surface);
}

.color-input input.transparent-input {
  background-image:
    linear-gradient(45deg, var(--studio-border-strong) 25%, transparent 25%),
    linear-gradient(-45deg, var(--studio-border-strong) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--studio-border-strong) 75%),
    linear-gradient(-45deg, transparent 75%, var(--studio-border-strong) 75%);
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
  border-color: var(--studio-primary);
}

.color-picker {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 1000;
  width: 300px;
  background: var(--studio-surface-raised);
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  padding: 8px;
  box-shadow: var(--studio-shadow-md);
}

.tabs {
  display: flex;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--studio-border);
}

.tab {
  padding: 6px 12px;
  cursor: pointer;
  color: var(--studio-text-muted);
  font-size: 13px;
}

.tab.active {
  color: var(--studio-text);
  border-bottom: 2px solid var(--studio-primary);
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
  border: 1px solid var(--studio-border);
  transition: transform 0.2s;
  position: relative;
}

.color-cell[style*='transparent'] {
  background-image:
    linear-gradient(45deg, var(--studio-border-strong) 25%, transparent 25%),
    linear-gradient(-45deg, var(--studio-border-strong) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--studio-border-strong) 75%),
    linear-gradient(-45deg, transparent 75%, var(--studio-border-strong) 75%);
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
  border-color: var(--studio-primary);
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
  border: 1px solid var(--studio-border);
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
  background-color: var(--studio-primary);
  color: var(--color-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 8px;
}

.save-variable-btn:hover {
  background-color: var(--studio-primary-hover);
}

.recent-colors {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--studio-border);
}

.recent-colors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.recent-colors-title {
  font-size: 12px;
  color: var(--studio-text-muted);
}

.toggle-list-btn {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--studio-text-muted);
  background-color: transparent;
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  cursor: pointer;
}

.toggle-list-btn:hover {
  border-color: var(--studio-primary);
  color: var(--studio-primary);
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
  background-color: var(--studio-surface-soft);
}

.color-preview-small {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 8px;
  border: 1px solid var(--studio-border);
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
  color: var(--studio-text-subtle);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.delete-btn:hover {
  color: #f56c6c;
  background: rgba(248, 113, 113, 0.14);
}

.color-hex {
  font-size: 12px;
  color: var(--studio-text-muted);
}

.color-name {
  font-size: 12px;
  color: var(--studio-primary);
  cursor: text;
  padding: 2px 4px;
  border-radius: 4px;
}

.color-name:hover {
  background-color: var(--studio-primary-soft);
}

.color-name.editing {
  background-color: var(--studio-surface);
}

.name-input {
  width: 100%;
  border: 1px solid var(--studio-primary);
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
  color: var(--studio-primary);
  outline: none;
  background: transparent;
}

.name-input:focus {
  border-color: var(--studio-primary-hover);
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
  border: 1px solid var(--studio-border);
  transition: transform 0.2s;
}

.recent-color:hover {
  transform: scale(1.1);
  z-index: 1;
  border-color: var(--studio-primary);
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
