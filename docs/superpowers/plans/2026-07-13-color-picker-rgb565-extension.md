# ColorPicker RGB565 Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为通用 ColorPicker 增加按需进入的 RGB565 可视化色谱，同时保持现有 64 色矩阵为默认模式。

**Architecture:** 把 RGB565 与 HSV 转换提取为通用纯函数；新增独立 `Rgb565ColorSpectrum.vue` 负责 Pointer/键盘交互；通用 `ColorPicker` 只管理快捷模式与扩展模式切换，并沿用现有单色、渐变和属性绑定 emits。颜色属性默认值改为复用同一个 RGB565 工具，删除重复算法。

**Tech Stack:** Vue 3 Composition API、TypeScript、Pointer Events、Pinia、Vitest、Vite

---

## 文件结构

- 新建 `src/utils/rgb565Color.ts`：颜色解析、RGB565 量化、HSV/RGB 转换和范围限制。
- 新建 `src/utils/rgb565Color.test.ts`：纯函数边界、往返与幂等测试。
- 修改 `src/components/properties/dialogs/colorPropertyOptions.ts`：复用通用 RGB565 工具。
- 新建 `src/components/color-picker/Rgb565ColorSpectrum.vue`：色谱 UI、Pointer Events 和键盘交互。
- 新建 `src/components/color-picker/Rgb565ColorSpectrum.test.ts`：色谱组件结构与交互契约。
- 修改 `src/components/color-picker/index.vue`：More Colors 入口、模式切换和现有 emit 路由。
- 修改 `src/components/color-picker/colorSelection.test.ts`：通用 ColorPicker 扩展模式回归契约。
- 修改 `src/i18n.ts`：More Colors、返回和 RGB565 色谱可访问文本。

### Task 1: 通用 RGB565 与 HSV 纯函数

**Files:**
- Create: `src/utils/rgb565Color.ts`
- Create: `src/utils/rgb565Color.test.ts`
- Modify: `src/components/properties/dialogs/colorPropertyOptions.ts`
- Modify: `src/components/properties/dialogs/colorPropertyOptions.test.ts`

- [ ] **Step 1: 写 RGB565 与 HSV 失败测试**

```ts
import { describe, expect, it } from 'vitest'
import {
  clampUnit,
  hsvToRgb,
  normalizeRgb565Hex,
  parseHexColor,
  rgbToHsv,
} from './rgb565Color'

describe('rgb565Color', () => {
  it.each([
    ['#000000', '#000000'],
    ['#FFFFFF', '#FFFFFF'],
    ['#123456', '#103452'],
    ['0xABCDEF', '#ADCFEF'],
    ['abcdef', '#ADCFEF'],
    ['transparent', '#FFFFFF'],
  ])('quantizes %s as %s', (input, expected) => {
    expect(normalizeRgb565Hex(input)).toBe(expected)
  })

  it('keeps an RGB565 value stable', () => {
    const value = normalizeRgb565Hex('#39A7D4')
    expect(normalizeRgb565Hex(value)).toBe(value)
  })

  it('parses supported hex forms and rejects invalid input', () => {
    expect(parseHexColor('0x123456')).toEqual({ r: 18, g: 52, b: 86 })
    expect(parseHexColor('bad')).toBeNull()
  })

  it('round-trips primary colors through HSV', () => {
    for (const rgb of [{ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 }]) {
      expect(hsvToRgb(rgbToHsv(rgb))).toEqual(rgb)
    }
  })

  it('clamps normalized coordinates', () => {
    expect(clampUnit(-0.2)).toBe(0)
    expect(clampUnit(0.4)).toBe(0.4)
    expect(clampUnit(1.2)).toBe(1)
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:unit -- src/utils/rgb565Color.test.ts`

Expected: FAIL，提示 `rgb565Color` 模块或导出不存在。

- [ ] **Step 3: 实现最小通用颜色工具**

```ts
export interface RgbColor { r: number; g: number; b: number }
export interface HsvColor { h: number; s: number; v: number }

export const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

export const parseHexColor = (value: unknown): RgbColor | null => {
  const match = String(value ?? '').trim().match(/^(?:#|0x)?([0-9a-f]{6})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1].slice(0, 2), 16),
    g: parseInt(match[1].slice(2, 4), 16),
    b: parseInt(match[1].slice(4, 6), 16),
  }
}

const expand5 = (value: number) => (value << 3) | (value >> 2)
const expand6 = (value: number) => (value << 2) | (value >> 4)

export const normalizeRgb565Hex = (value: unknown): string => {
  const rgb = parseHexColor(value) ?? { r: 255, g: 255, b: 255 }
  const r = expand5(Math.round(rgb.r * 31 / 255))
  const g = expand6(Math.round(rgb.g * 63 / 255))
  const b = expand5(Math.round(rgb.b * 31 / 255))
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}
```

在同一文件增加 HSV/RGB 转换与十六进制输出：

```ts
export const rgbToHsv = ({ r, g, b }: RgbColor): HsvColor => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6)
    else if (max === green) h = 60 * ((blue - red) / delta + 2)
    else h = 60 * ((red - green) / delta + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : delta / max, v: max }
}

export const hsvToRgb = ({ h, s, v }: HsvColor): RgbColor => {
  const hue = ((h % 360) + 360) % 360
  const chroma = v * s
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1))
  const m = v - chroma
  const sectors = [
    [chroma, x, 0], [x, chroma, 0], [0, chroma, x],
    [0, x, chroma], [x, 0, chroma], [chroma, 0, x],
  ]
  const [red, green, blue] = sectors[Math.min(5, Math.floor(hue / 60))]
  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  }
}

export const rgbToHex = ({ r, g, b }: RgbColor): string =>
  `#${[r, g, b].map((channel) => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, '0')).join('').toUpperCase()}`
```

- [ ] **Step 4: 运行纯函数测试**

Run: `npm run test:unit -- src/utils/rgb565Color.test.ts`

Expected: PASS，全部纯函数测试通过。

- [ ] **Step 5: 让颜色属性复用通用量化函数**

```ts
import { normalizeRgb565Hex } from '@/utils/rgb565Color'

export const normalizeRgb565GarminColor = (value: unknown): string =>
  `0x${normalizeRgb565Hex(value).slice(1).toLowerCase()}`
```

删除 `colorPropertyOptions.ts` 内部的重复解析和 expand 函数，保持现有导出与小写 Garmin 值契约不变。

- [ ] **Step 6: 运行两组 RGB565 测试**

Run: `npm run test:unit -- src/utils/rgb565Color.test.ts src/components/properties/dialogs/colorPropertyOptions.test.ts`

Expected: PASS，新旧 API 的全部测试通过。

- [ ] **Step 7: 提交通用工具**

```bash
git add src/utils/rgb565Color.ts src/utils/rgb565Color.test.ts src/components/properties/dialogs/colorPropertyOptions.ts src/components/properties/dialogs/colorPropertyOptions.test.ts
git commit -m "提取通用 RGB565 颜色工具"
```

### Task 2: RGB565 可视化色谱组件

**Files:**
- Create: `src/components/color-picker/Rgb565ColorSpectrum.vue`
- Create: `src/components/color-picker/Rgb565ColorSpectrum.test.ts`

- [ ] **Step 1: 写色谱组件失败契约测试**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Rgb565ColorSpectrum contract', () => {
  const source = readFileSync(new URL('./Rgb565ColorSpectrum.vue', import.meta.url), 'utf8')

  it('supports pointer selection and capture', () => {
    expect(source).toContain('@pointerdown="startSpectrumDrag"')
    expect(source).toContain('@pointermove="moveSpectrumDrag"')
    expect(source).toContain('setPointerCapture')
    expect(source).toContain('normalizeRgb565Hex')
  })

  it('exposes keyboard-accessible sliders', () => {
    expect(source).toContain('role="slider"')
    expect(source).toContain(':aria-valuenow')
    expect(source).toContain('@keydown="handleSpectrumKeydown"')
    expect(source).toContain('@keydown="handleHueKeydown"')
  })

  it('emits only quantized colors', () => {
    expect(source).toContain("defineEmits<{'change': [value: string]}>()")
    expect(source).toContain("emit('change', normalizeRgb565Hex")
  })
})
```

- [ ] **Step 2: 运行契约测试并确认失败**

Run: `npm run test:unit -- src/components/color-picker/Rgb565ColorSpectrum.test.ts`

Expected: FAIL，组件文件不存在。

- [ ] **Step 3: 实现色谱模板与状态**

组件 props/emits：

```ts
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{'change': [value: string]}>()
```

模板使用以下结构；二维区域背景由当前 Hue 纯色、白色横向渐变和黑色纵向渐变叠加，Hue 条使用固定彩虹渐变：

```vue
<section class="rgb565-spectrum">
  <div
    ref="spectrumRef"
    class="rgb565-spectrum-field"
    role="slider"
    tabindex="0"
    :aria-label="t('colorPicker.saturationBrightness')"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="Math.round(saturation * 100)"
    :style="spectrumStyle"
    @pointerdown="startSpectrumDrag"
    @pointermove="moveSpectrumDrag"
    @pointerup="stopSpectrumDrag"
    @pointercancel="stopSpectrumDrag"
    @keydown="handleSpectrumKeydown">
    <span class="rgb565-spectrum-cursor" :style="spectrumCursorStyle" />
  </div>
  <div
    ref="hueRef"
    class="rgb565-spectrum-hue"
    role="slider"
    tabindex="0"
    :aria-label="t('colorPicker.hue')"
    aria-valuemin="0"
    aria-valuemax="360"
    :aria-valuenow="Math.round(hue)"
    @pointerdown="startHueDrag"
    @pointermove="moveHueDrag"
    @pointerup="stopHueDrag"
    @pointercancel="stopHueDrag"
    @keydown="handleHueKeydown">
    <span class="rgb565-hue-cursor" :style="hueCursorStyle" />
  </div>
  <div class="rgb565-spectrum-result">
    <span class="rgb565-result-swatch" :style="{ backgroundColor: quantizedColor }" />
    <code>{{ quantizedColor }}</code>
  </div>
</section>
```

- [ ] **Step 4: 实现 Pointer Events**

```ts
const updateSpectrumFromPointer = (event: PointerEvent) => {
  const rect = spectrumRef.value!.getBoundingClientRect()
  saturation.value = clampUnit((event.clientX - rect.left) / rect.width)
  brightness.value = 1 - clampUnit((event.clientY - rect.top) / rect.height)
  emitCurrentColor()
}

const startSpectrumDrag = (event: PointerEvent) => {
  spectrumDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updateSpectrumFromPointer(event)
}
```

Hue 与停止逻辑使用以下实现：

```ts
const updateHueFromPointer = (event: PointerEvent) => {
  const rect = hueRef.value!.getBoundingClientRect()
  hue.value = clampUnit((event.clientX - rect.left) / rect.width) * 360
  emitCurrentColor()
}

const startHueDrag = (event: PointerEvent) => {
  hueDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updateHueFromPointer(event)
}

const moveSpectrumDrag = (event: PointerEvent) => {
  if (spectrumDragging.value) updateSpectrumFromPointer(event)
}
const moveHueDrag = (event: PointerEvent) => {
  if (hueDragging.value) updateHueFromPointer(event)
}
const stopSpectrumDrag = () => { spectrumDragging.value = false }
const stopHueDrag = () => { hueDragging.value = false }
```

- [ ] **Step 5: 实现键盘微调与量化 emit**

二维色谱方向键每次改变 S 或 V 的 `1/100`；Hue 左右键每次改变 1 度。每次变化调用：

```ts
const emitCurrentColor = () => {
  emit('change', normalizeRgb565Hex(rgbToHex(hsvToRgb({
    h: hue.value,
    s: saturation.value,
    v: brightness.value,
  }))))
}
```

监听 `modelValue`，通过 `parseHexColor()` 和 `rgbToHsv()` 同步外部变化；非法值以白色初始化。

- [ ] **Step 6: 运行色谱与颜色工具测试**

Run: `npm run test:unit -- src/components/color-picker/Rgb565ColorSpectrum.test.ts src/utils/rgb565Color.test.ts`

Expected: PASS，两组测试通过。

- [ ] **Step 7: 提交色谱组件**

```bash
git add src/components/color-picker/Rgb565ColorSpectrum.vue src/components/color-picker/Rgb565ColorSpectrum.test.ts
git commit -m "增加 RGB565 可视化色谱"
```

### Task 3: 通用 ColorPicker 扩展模式接入

**Files:**
- Modify: `src/components/color-picker/index.vue`
- Modify: `src/components/color-picker/colorSelection.test.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: 写 ColorPicker 模式切换失败测试**

在 `colorSelection.test.ts` 增加源码契约：

```ts
import { readFileSync } from 'node:fs'

it('keeps quick colors as default and exposes RGB565 as an extension', () => {
  const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
  expect(source).toContain("const pickerView = ref('quick')")
  expect(source).toContain("t('colorPicker.moreColors')")
  expect(source).toContain('<Rgb565ColorSpectrum')
  expect(source).toContain("pickerView.value = 'quick'")
})

it('routes RGB565 changes through solid and gradient paths', () => {
  const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
  expect(source).toContain('handleRgb565Change')
  expect(source).toContain('updateGradientStop(activeGradientStop.value, color)')
  expect(source).toContain('selectColor({ hex: color, value: color })')
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:unit -- src/components/color-picker/colorSelection.test.ts`

Expected: FAIL，More Colors 和 `pickerView` 尚不存在。

- [ ] **Step 3: 接入快捷/扩展视图**

默认状态：

```ts
const pickerView = ref<'quick' | 'rgb565'>('quick')
```

快捷内容外层使用 `v-if="pickerView === 'quick'"`，在矩阵下增加：

```vue
<button type="button" class="more-colors-button" @click="pickerView = 'rgb565'">
  {{ t('colorPicker.moreColors') }}
</button>
```

扩展内容使用：

```vue
<section v-else class="rgb565-picker-view">
  <button type="button" class="rgb565-back-button" @click="pickerView = 'quick'">
    {{ t('colorPicker.backToQuickColors') }}
  </button>
  <Rgb565ColorSpectrum :model-value="activeRgb565Color" @change="handleRgb565Change" />
</section>
```

- [ ] **Step 4: 路由单色与渐变变化**

```ts
const activeRgb565Color = computed(() => {
  if (!isGradientMode.value) return normalizeOpaqueColor(inputValue.value) || '#FFFFFF'
  return activeGradientStop.value === 'start'
    ? localGradientStartColor.value
    : localGradientEndColor.value
})

const handleRgb565Change = (color: string) => {
  if (isGradientMode.value) {
    updateGradientStop(activeGradientStop.value, color)
  } else {
    selectColor({ hex: color, value: color })
  }
}
```

`togglePicker()` 从关闭变为打开时先设置 `pickerView.value = 'quick'`，确保每次默认回到 64 色模式。

- [ ] **Step 5: 增加中英文文案**

```ts
'colorPicker.moreColors': 'More Colors…',
'colorPicker.backToQuickColors': 'Back to Quick Colors',
'colorPicker.rgb565Color': 'RGB565 Color',
'colorPicker.saturationBrightness': 'Saturation and brightness',
'colorPicker.hue': 'Hue',
```

中文对应：`更多颜色…`、`返回快捷颜色`、`RGB565 颜色`、`饱和度和亮度`、`色相`。

- [ ] **Step 6: 运行 ColorPicker 全部相关测试**

Run: `npm run test:unit -- src/components/color-picker/colorSelection.test.ts src/components/color-picker/Rgb565ColorSpectrum.test.ts src/utils/rgb565Color.test.ts src/components/properties/dialogs/colorPropertyOptions.test.ts`

Expected: PASS，快捷模式、扩展模式、色谱和颜色属性回归测试全部通过。

- [ ] **Step 7: 格式化并提交接入**

Run: `npx prettier --write src/components/color-picker/index.vue src/components/color-picker/Rgb565ColorSpectrum.vue src/components/color-picker/Rgb565ColorSpectrum.test.ts src/components/color-picker/colorSelection.test.ts src/utils/rgb565Color.ts src/utils/rgb565Color.test.ts src/components/properties/dialogs/colorPropertyOptions.ts src/components/properties/dialogs/colorPropertyOptions.test.ts src/i18n.ts`

Run: `npx prettier --check src/components/color-picker/index.vue src/components/color-picker/Rgb565ColorSpectrum.vue src/components/color-picker/Rgb565ColorSpectrum.test.ts src/components/color-picker/colorSelection.test.ts src/utils/rgb565Color.ts src/utils/rgb565Color.test.ts src/components/properties/dialogs/colorPropertyOptions.ts src/components/properties/dialogs/colorPropertyOptions.test.ts src/i18n.ts`

Expected: PASS，所有目标文件符合项目 Prettier 配置。

```bash
git add src/components/color-picker/index.vue src/components/color-picker/colorSelection.test.ts src/i18n.ts
git commit -m "扩展 ColorPicker RGB565 取色模式"
```

### Task 4: 回归与构建验证

**Files:**
- Verify: `src/components/color-picker/index.vue`
- Verify: `src/components/color-picker/Rgb565ColorSpectrum.vue`
- Verify: `src/utils/rgb565Color.ts`
- Verify: `src/components/properties/dialogs/colorPropertyOptions.ts`

- [ ] **Step 1: 运行全部单元测试**

Run: `npm run test:unit`

Expected: 所有测试通过；若仍出现工作区其他进行中功能的已知失败，记录准确测试名，并确认本分支隔离基线是否通过。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: `vue-tsc --noEmit` 和 `vite build --mode prod` 成功，退出码为 0。

- [ ] **Step 3: 检查提交范围**

Run: `git diff --check HEAD~3..HEAD`

Expected: 无输出，退出码为 0。

- [ ] **Step 4: 手工验证 Time TTF 与渐变场景**

Run: `npm run dev`

Expected:

- Time 选择 TrueType Font 后，Font Color 默认打开仍显示 64 色矩阵。
- 点击 More Colors 后显示二维色谱、Hue 滑条和量化后的 RGB565 值。
- 拖动色谱可看到 64 色矩阵之外的颜色，输出始终是 RGB565 展开值。
- 返回快捷模式后当前颜色保持；关闭再打开时回到快捷模式。
- 透明色仍可从快捷矩阵选择。
- 渐变起点和终点分别能通过 More Colors 修改，且只修改当前激活 stop。

- [ ] **Step 5: 记录验证结论**

若无需修复，不创建空提交；交付说明记录专项测试、全量测试、生产构建和手工验证结果。发现问题时先添加能复现问题的失败测试，再做单一修复。
