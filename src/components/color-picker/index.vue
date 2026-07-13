<template>
  <div class="color-picker-wrapper" @click.stop ref="wrapperRef">
    <div class="color-input" @click="togglePicker">
      <input
        :value="displayInputValue"
        :readonly="isGradientMode"
        @input="handleDisplayInput"
        @keydown.enter.prevent="handleInputConfirm"
        @blur="handleInputConfirm"
        :class="{
          'transparent-input': !isGradientMode && modelValue === 'transparent',
          'gradient-input': isGradientMode,
        }"
        :style="inputStyle" />
    </div>
    <div v-if="isOpen" ref="pickerRef" class="color-picker" :style="pickerStyle">
      <div class="tabs">
        <button type="button" class="tab" :class="{ active: activeMode === 'solid' }" @click="setMode('solid')">
          {{ t('colorPicker.solid') }}
        </button>
        <button
          v-if="enableGradient"
          type="button"
          class="tab"
          :class="{ active: activeMode === 'gradient' }"
          @click="setMode('gradient')">
          {{ t('colorPicker.gradient') }}
        </button>
      </div>

      <div v-if="isGradientMode" class="gradient-editor">
        <div class="gradient-preview" :style="gradientPreviewStyle" />
        <div class="gradient-stops">
          <label
            class="gradient-stop"
            :class="{ active: activeGradientStop === 'start' }"
            @click="activeGradientStop = 'start'">
            <span>{{ t('colorPicker.gradientStart') }}</span>
            <input
              :value="localGradientStartColor"
              @focus="activeGradientStop = 'start'"
              @keydown.enter.prevent="handleGradientInputConfirm('start', $event)"
              @blur="handleGradientInputConfirm('start', $event)" />
          </label>
          <label
            class="gradient-stop"
            :class="{ active: activeGradientStop === 'end' }"
            @click="activeGradientStop = 'end'">
            <span>{{ t('colorPicker.gradientEnd') }}</span>
            <input
              :value="localGradientEndColor"
              @focus="activeGradientStop = 'end'"
              @keydown.enter.prevent="handleGradientInputConfirm('end', $event)"
              @blur="handleGradientInputConfirm('end', $event)" />
          </label>
        </div>
      </div>

      <template v-if="pickerView === 'quick'">
        <!-- 颜色矩阵 -->
        <div class="color-matrix">
          <div v-for="color in visibleColorMatrix" :key="color" class="color-cell" :style="{ backgroundColor: color }" @click="selectColor({hex: color, value: color})"></div>
        </div>

        <button type="button" class="more-colors-button" @click="pickerView = 'rgb565'">
          {{ t('colorPicker.moreColors') }}
        </button>

        <!-- 当前使用的颜色 -->
        <div v-if="colorProperties.length > 0" class="recent-colors">
          <div class="recent-colors-header">
            <div class="recent-colors-title">{{ t('colorPicker.currentColors') }}</div>
          </div>
          <div class="color-variables-list">
            <div v-for="colorProperty in visibleColorProperties" :key="colorProperty.name" class="color-variable-item" @click="selectColor(colorProperty)">
              <div class="color-preview-small" :style="{ backgroundColor: colorProperty.hex }"></div>
              <div class="color-variable-info">
                <div class="color-hex">{{ colorProperty.hex }}</div>
                <div class="color-name">{{ colorProperty.name }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <section v-else class="rgb565-picker-view">
        <button type="button" class="rgb565-back-button" @click="pickerView = 'quick'">
          {{ t('colorPicker.backToQuickColors') }}
        </button>
        <Rgb565ColorSpectrum :model-value="activeRgb565Color" @change="handleRgb565Change" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import emitter from '@/utils/eventBus.ts'
import { usePropertiesStore } from '@/stores/properties'
import { useI18n } from '@/i18n'
import { toColorSelectionPayload } from './colorSelection'
import Rgb565ColorSpectrum from './Rgb565ColorSpectrum.vue'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    // 兼容字符串和数字（有些元素用 -1 之类的数值占位）
    type: [String, Number],
    default: '#FFFFFF'
  },
  popupZIndex: {
    type: Number,
    default: 10000
  },
  enableGradient: {
    type: Boolean,
    default: false
  },
  gradientEnabled: {
    type: Boolean,
    default: false
  },
  gradientStartColor: {
    type: String,
    default: '#FFFFFF'
  },
  gradientEndColor: {
    type: String,
    default: '#00FFFF'
  }
})

const emit = defineEmits([
  'update:modelValue',
  'change',
  'property-change',
  'update:gradientEnabled',
  'update:gradientStartColor',
  'update:gradientEndColor',
  'gradientChange',
])

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
const pickerRef = ref(null)
const pickerStyle = ref({})
const pickerView = ref('quick')
// 为每个实例生成唯一标识，用于互斥控制
const instanceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
const settingsPopupId = `color-picker_${instanceId}`
// 内部统一使用字符串表示颜色
const hexColor = ref(typeof props.modelValue === 'string' ? props.modelValue : String(props.modelValue))
const inputValue = ref(typeof props.modelValue === 'string' ? props.modelValue : String(props.modelValue))
const activeMode = ref(props.enableGradient && props.gradientEnabled ? 'gradient' : 'solid')
const activeGradientStop = ref('start')
const localGradientStartColor = ref(normalizeOpaqueColor(props.gradientStartColor) || '#FFFFFF')
const localGradientEndColor = ref(normalizeOpaqueColor(props.gradientEndColor) || '#00FFFF')
const isGradientMode = computed(() => props.enableGradient && activeMode.value === 'gradient')
const visibleColorMatrix = computed(() => isGradientMode.value
  ? colorMatrix.filter((color) => color !== 'transparent')
  : colorMatrix)

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
const visibleColorProperties = computed(() => isGradientMode.value
  ? colorProperties.value.filter((color) => normalizeOpaqueColor(color.hex))
  : colorProperties.value)

const activeRgb565Color = computed(() => {
  if (!isGradientMode.value) return normalizeOpaqueColor(inputValue.value) || '#FFFFFF'
  return activeGradientStop.value === 'start'
    ? localGradientStartColor.value
    : localGradientEndColor.value
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

const displayInputValue = computed(() => isGradientMode.value
  ? `${localGradientStartColor.value} - ${localGradientEndColor.value}`
  : inputValue.value)

const gradientPreviewStyle = computed(() => ({
  background: `linear-gradient(90deg, ${localGradientStartColor.value}, ${localGradientEndColor.value})`,
}))

const inputStyle = computed(() => {
  if (isGradientMode.value) {
    return {
      background: gradientPreviewStyle.value.background,
      color: 'transparent',
      textShadow: 'none',
    }
  }
  return {
    backgroundColor: props.modelValue === 'transparent' ? 'transparent' : props.modelValue,
    color: props.modelValue === 'transparent' ? 'var(--studio-text-muted)' : textColor.value,
  }
})

const emitGradientChange = () => {
  emit('gradientChange', {
    enabled: isGradientMode.value,
    startColor: localGradientStartColor.value,
    endColor: localGradientEndColor.value,
  })
}

const updateGradientStop = (stop, color) => {
  const normalized = normalizeOpaqueColor(color)
  if (!normalized) return

  propertiesStore.setLastSelectedColor(normalized)
  if (stop === 'start') {
    localGradientStartColor.value = normalized
    emit('update:gradientStartColor', normalized)
  } else {
    localGradientEndColor.value = normalized
    emit('update:gradientEndColor', normalized)
  }
  emitGradientChange()
}

const setMode = (mode) => {
  if (mode === 'gradient' && !props.enableGradient) return
  activeMode.value = mode
  const enabled = mode === 'gradient'
  emit('update:gradientEnabled', enabled)
  if (enabled) {
    emit('update:gradientStartColor', localGradientStartColor.value)
    emit('update:gradientEndColor', localGradientEndColor.value)
  }
  emitGradientChange()
  nextTick(positionColorPicker)
}

// 选择颜色
const selectColor = (color) => {
  if (isGradientMode.value) {
    updateGradientStop(activeGradientStop.value, color.hex)
    return
  }
  hexColor.value = color.hex
  inputValue.value = color.hex
  propertiesStore.setLastSelectedColor(color.hex)
  emit('update:modelValue', color.hex)
  emit('change', color.hex)
  emit('property-change', toColorSelectionPayload(color))
}

const handleRgb565Change = (color) => {
  if (isGradientMode.value) {
    updateGradientStop(activeGradientStop.value, color)
  } else {
    selectColor({ hex: color, value: color })
  }
}

// 更新颜色
const updateColor = () => {
  propertiesStore.setLastSelectedColor(hexColor.value)
  emit('update:modelValue', hexColor.value)
  emit('change', hexColor.value)
  emit('property-change', toColorSelectionPayload({ hex: hexColor.value }))
}

// 从十六进制更新
const updateFromHex = () => {
  if (hexColor.value.startsWith('#')) {
    propertiesStore.setLastSelectedColor(hexColor.value)
    emit('update:modelValue', `0x${hexColor.value.slice(1)}`)
  }
}

// 工具函数
const isValidHex = (hex) => /^#[0-9A-F]{6}$/i.test(hex)

function normalizeOpaqueColor(raw) {
  const value = String(raw ?? '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value.toUpperCase()
  if (/^0x[0-9A-Fa-f]{6}$/.test(value)) return `#${value.slice(2).toUpperCase()}`
  if (/^[0-9A-Fa-f]{6}$/.test(value)) return `#${value.toUpperCase()}`
  return null
}
  
// 监听点击外部关闭
const handleOutsideClick = (event) => {
  if (!event.target.closest('.color-picker-wrapper')) {
    isOpen.value = false
  }
}

const positionColorPicker = () => {
  const anchorEl = wrapperRef.value
  const pickerEl = pickerRef.value
  if (!isOpen.value || !anchorEl || !pickerEl) return

  const viewportPadding = 8
  const popupGap = 4
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0
  const anchorRect = anchorEl.getBoundingClientRect()
  const targetWidth = Math.max(0, Math.min(300, viewportWidth - viewportPadding * 2))
  const naturalHeight = pickerEl.scrollHeight || pickerEl.getBoundingClientRect().height || 0
  const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - popupGap - viewportPadding)
  const spaceAbove = Math.max(0, anchorRect.top - popupGap - viewportPadding)
  const openAbove = naturalHeight > spaceBelow && spaceAbove > spaceBelow
  const availableHeight = openAbove ? spaceAbove : spaceBelow
  const maxHeight = Math.max(0, Math.min(naturalHeight, availableHeight || viewportHeight - viewportPadding * 2))

  let top = openAbove
    ? anchorRect.top - popupGap - maxHeight
    : anchorRect.bottom + popupGap
  top = Math.max(viewportPadding, Math.min(top, viewportHeight - viewportPadding - maxHeight))

  let left = anchorRect.left
  left = Math.max(viewportPadding, Math.min(left, viewportWidth - viewportPadding - targetWidth))

  pickerStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${targetWidth}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: props.popupZIndex
  }
}

const handleSettingsPopupOpen = (id) => {
  if (id !== settingsPopupId) {
    isOpen.value = false
  }
}

// 添加和移除事件监听
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('resize', positionColorPicker)
  document.addEventListener('scroll', positionColorPicker, true)
  emitter.on('settings-popup-open', handleSettingsPopupOpen)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('resize', positionColorPicker)
  document.removeEventListener('scroll', positionColorPicker, true)
  emitter.off('settings-popup-open', handleSettingsPopupOpen)
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

watch(
  () => props.gradientEnabled,
  (enabled) => {
    if (props.enableGradient) activeMode.value = enabled ? 'gradient' : 'solid'
  }
)

watch(
  () => props.gradientStartColor,
  (color) => {
    const normalized = normalizeOpaqueColor(color)
    if (normalized) localGradientStartColor.value = normalized
  }
)

watch(
  () => props.gradientEndColor,
  (color) => {
    const normalized = normalizeOpaqueColor(color)
    if (normalized) localGradientEndColor.value = normalized
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
  if (isGradientMode.value) return
  const normalized = normalizeInputToHex(inputValue.value)
  if (!normalized) return

  // 透明色单独处理
  if (normalized === 'transparent') {
    hexColor.value = 'transparent'
    propertiesStore.setLastSelectedColor('transparent')
    emit('update:modelValue', 'transparent')
    emit('change', 'transparent')
    emit('property-change', toColorSelectionPayload({ hex: 'transparent' }))
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

  // 若未命中任何选项，仍然按该 hex 作为当前颜色
  hexColor.value = normalized
  propertiesStore.setLastSelectedColor(normalized)
  emit('update:modelValue', normalized)
  emit('change', normalized)
  emit('property-change', toColorSelectionPayload({ hex: normalized }))
  inputValue.value = normalized
}

const handleDisplayInput = (event) => {
  if (!isGradientMode.value) inputValue.value = event.target.value
}

const handleGradientInputConfirm = (stop, event) => {
  const normalized = normalizeOpaqueColor(event.target.value)
  if (!normalized) {
    event.target.value = stop === 'start' ? localGradientStartColor.value : localGradientEndColor.value
    return
  }
  event.target.value = normalized
  updateGradientStop(stop, normalized)
}

const togglePicker = () => {
  // 切换打开/关闭；当打开时，广播给其他实例进行关闭
  const willOpen = !isOpen.value
  isOpen.value = willOpen
  if (willOpen) {
    pickerView.value = 'quick'
    emitter.emit('settings-popup-open', settingsPopupId)
    nextTick(positionColorPicker)
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
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  overflow-y: auto;
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
  border: 0;
  background: transparent;
  padding: 6px 12px;
  cursor: pointer;
  color: var(--studio-text-muted);
  font-size: 13px;
}

.gradient-editor {
  margin-bottom: 10px;
}

.gradient-preview {
  height: 28px;
  margin-bottom: 8px;
  border: 1px solid var(--studio-border);
  border-radius: 4px;
}

.gradient-stops {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.gradient-stop {
  display: block;
  min-width: 0;
  padding: 6px;
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  cursor: pointer;
}

.gradient-stop.active {
  border-color: var(--studio-primary);
}

.gradient-stop span {
  display: block;
  margin-bottom: 4px;
  color: var(--studio-text-muted);
  font-size: 11px;
}

.gradient-stop input {
  width: 100%;
  min-width: 0;
  height: 26px;
  padding: 2px 4px;
  border: 1px solid var(--studio-border);
  border-radius: 3px;
  color: var(--studio-text);
  background: var(--studio-surface);
  font-size: 12px;
  text-align: center;
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
  align-items: center;
  margin-bottom: 8px;
}

.recent-colors-title {
  font-size: 12px;
  color: var(--studio-text-muted);
}

.color-variables-list {
  overflow: visible;
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

.more-colors-button,
.rgb565-back-button {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  color: var(--studio-primary);
  background: var(--studio-surface-soft);
  cursor: pointer;
  font: inherit;
}

.more-colors-button:hover,
.rgb565-back-button:hover {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.rgb565-picker-view {
  display: grid;
  gap: 12px;
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

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
