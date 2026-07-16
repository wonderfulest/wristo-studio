# Color Property Canvas Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Color Property 弹窗的颜色选择器中，单独展示当前画布已使用且经过 RGB565 归一化的颜色，并允许点击复用。

**Architecture:** 用无状态纯函数递归扫描 `elementDataStore` 的元素配置并生成稳定去重的 RGB565 调色板。Color Property 弹窗负责读取 store 并通过可选 prop 传给共享 `ColorPicker`，从而保证其他颜色选择器不显示该区域。

**Tech Stack:** Vue 3 Composition API、Pinia、TypeScript、Vitest、Element Plus、现有 RGB565 工具。

---

## 文件结构

- 新建 `src/components/properties/dialogs/canvasColorPalette.ts`：只负责从画布元素配置提取、RGB565 归一化并去重颜色。
- 新建 `src/components/properties/dialogs/canvasColorPalette.test.ts`：验证递归提取、格式支持、过滤和去重。
- 修改 `src/components/color-picker/index.vue`：增加可选 `canvasColors` prop，并渲染独立的色块区域。
- 修改 `src/components/color-picker/colorSelection.test.ts`：锁定共享选择器的可选展示和点击选择契约。
- 修改 `src/components/properties/dialogs/ColorPropertyDialog.vue`：读取 `elementDataStore`，计算画布颜色并传给 `ColorPicker`。
- 修改 `src/components/properties/dialogs/ColorPropertyDialog.test.ts`：锁定仅由 Color Property 弹窗注入画布颜色的契约。
- 修改 `src/i18n.ts`：增加 `Canvas Colors` 的中英文文案。

### Task 1: 提取并归一化画布颜色

**Files:**
- Create: `src/components/properties/dialogs/canvasColorPalette.ts`
- Test: `src/components/properties/dialogs/canvasColorPalette.test.ts`

- [ ] **Step 1: 写出失败的纯函数测试**

创建 `src/components/properties/dialogs/canvasColorPalette.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { collectCanvasColors } from './canvasColorPalette'

describe('collectCanvasColors', () => {
  it('recursively collects valid colors and normalizes them to RGB565', () => {
    expect(
      collectCanvasColors([
        {
          config: {
            color: '#123456',
            gradient: {
              start: '0x123456',
              stops: [{ color: '00FF00' }]
            }
          }
        }
      ])
    ).toEqual(['#103452', '#00FF00'])
  })

  it('ignores transparent values, bindings, invalid strings, and empty data', () => {
    expect(
      collectCanvasColors([
        {
          config: {
            transparent: 'transparent',
            sentinel: '-1',
            binding: 'prop.color_1',
            invalid: '#123',
            empty: '',
            nothing: null
          }
        }
      ])
    ).toEqual([])
  })

  it('deduplicates colors after RGB565 normalization in first-seen order', () => {
    expect(
      collectCanvasColors([
        { config: { fill: '#123456' } },
        { config: { stroke: '0x103452', accent: '#FF0000' } }
      ])
    ).toEqual(['#103452', '#FF0000'])
  })
})
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `npm run test:unit -- src/components/properties/dialogs/canvasColorPalette.test.ts`

Expected: FAIL，提示无法解析 `./canvasColorPalette`。

- [ ] **Step 3: 实现最小纯函数**

创建 `src/components/properties/dialogs/canvasColorPalette.ts`：

```ts
import { normalizeRgb565Hex, parseHexColor } from '@/utils/rgb565Color'

export interface CanvasColorSource {
  config?: unknown
}

const collectValueColors = (value: unknown, colors: Set<string>): void => {
  if (typeof value === 'string') {
    if (parseHexColor(value)) colors.add(normalizeRgb565Hex(value))
    return
  }

  if (!value || typeof value !== 'object') return

  if (Array.isArray(value)) {
    value.forEach((item) => collectValueColors(item, colors))
    return
  }

  Object.values(value as Record<string, unknown>).forEach((item) =>
    collectValueColors(item, colors)
  )
}

export const collectCanvasColors = (elements: CanvasColorSource[]): string[] => {
  const colors = new Set<string>()
  elements.forEach((element) => collectValueColors(element?.config, colors))
  return Array.from(colors)
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm run test:unit -- src/components/properties/dialogs/canvasColorPalette.test.ts`

Expected: PASS，3 个用例全部通过。

- [ ] **Step 5: 提交纯函数与测试**

```bash
git add src/components/properties/dialogs/canvasColorPalette.ts src/components/properties/dialogs/canvasColorPalette.test.ts
git commit -m "feat: collect canvas colors for properties"
```

### Task 2: 在共享 ColorPicker 中增加可选画布颜色区域

**Files:**
- Modify: `src/components/color-picker/index.vue:59-84,106-130,799-831`
- Modify: `src/components/color-picker/colorSelection.test.ts:31-48`
- Modify: `src/i18n.ts:100-110,1792-1802`

- [ ] **Step 1: 增加失败的共享组件契约测试**

在 `src/components/color-picker/colorSelection.test.ts` 的 `ColorPicker RGB565 extension contract` 后新增：

```ts
describe('ColorPicker canvas colors contract', () => {
  const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

  it('renders canvas colors only when the optional prop has values', () => {
    expect(source).toContain('canvasColors:')
    expect(source).toContain('v-if="canvasColors.length > 0"')
    expect(source).toContain("t('colorPicker.canvasColors')")
    expect(source).toContain('class="canvas-colors-grid"')
  })

  it('routes canvas color clicks through the existing solid selection path', () => {
    expect(source).toContain('selectColor({ hex: color, value: color })')
  })
})
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `npm run test:unit -- src/components/color-picker/colorSelection.test.ts`

Expected: FAIL，缺少 `canvasColors` prop 和 `Canvas Colors` 区域。

- [ ] **Step 3: 增加 prop、模板、样式和文案**

在 `src/components/color-picker/index.vue` 的 props 中加入：

```js
  canvasColors: {
    type: Array,
    default: () => []
  },
```

在 `More Colors...` 按钮之后、`Current Colors` 之前加入：

```vue
<div v-if="canvasColors.length > 0" class="canvas-colors">
  <div class="canvas-colors-title">{{ t('colorPicker.canvasColors') }}</div>
  <div class="canvas-colors-grid">
    <button
      v-for="color in canvasColors"
      :key="color"
      type="button"
      class="canvas-color-cell"
      :style="{ backgroundColor: color }"
      :title="color"
      :aria-label="color"
      @click="selectColor({ hex: color, value: color })" />
  </div>
</div>
```

在 `src/components/color-picker/index.vue` 的 `.recent-colors` 样式之前加入：

```css
.canvas-colors {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--studio-border);
}

.canvas-colors-title {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--studio-text-muted);
}

.canvas-colors-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.canvas-color-cell {
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: 1px solid var(--studio-border);
  border-radius: 3px;
  cursor: pointer;
}

.canvas-color-cell:hover,
.canvas-color-cell:focus-visible {
  outline: 2px solid var(--studio-primary);
  outline-offset: 1px;
}
```

在 `src/i18n.ts` 的英文和中文颜色选择器文案中分别加入：

```ts
'colorPicker.canvasColors': 'Canvas Colors',
```

```ts
'colorPicker.canvasColors': '画布颜色',
```

- [ ] **Step 4: 运行共享组件测试并确认通过**

Run: `npm run test:unit -- src/components/color-picker/colorSelection.test.ts`

Expected: PASS，原 RGB565 契约和新增画布颜色契约全部通过。

- [ ] **Step 5: 提交共享组件改动**

```bash
git add src/components/color-picker/index.vue src/components/color-picker/colorSelection.test.ts src/i18n.ts
git commit -m "feat: show optional canvas colors in picker"
```

### Task 3: 仅在 Color Property 弹窗注入画布颜色

**Files:**
- Modify: `src/components/properties/dialogs/ColorPropertyDialog.vue:40,108-126`
- Modify: `src/components/properties/dialogs/ColorPropertyDialog.test.ts:1-23`

- [ ] **Step 1: 增加失败的弹窗专属接线测试**

在 `src/components/properties/dialogs/ColorPropertyDialog.test.ts` 中新增：

```ts
it('passes the current canvas palette to its ColorPicker', () => {
  expect(source).toContain("import { useElementDataStore } from '@/stores/elementDataStore'")
  expect(source).toContain('collectCanvasColors')
  expect(source).toContain('const canvasColors = computed(')
  expect(source).toContain(':canvas-colors="canvasColors"')
})
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `npm run test:unit -- src/components/properties/dialogs/ColorPropertyDialog.test.ts`

Expected: FAIL，弹窗尚未读取或传入画布颜色。

- [ ] **Step 3: 接入 elementDataStore 并传入专用 prop**

在 `src/components/properties/dialogs/ColorPropertyDialog.vue` 中加入 imports：

```js
import { useElementDataStore } from '@/stores/elementDataStore'
import { collectCanvasColors } from './canvasColorPalette'
```

在 store 初始化区域加入：

```js
const elementDataStore = useElementDataStore()
const canvasColors = computed(() => collectCanvasColors(elementDataStore.elements))
```

将默认颜色选择器改为：

```vue
<ColorPicker
  v-model="defaultColorHex"
  :canvas-colors="canvasColors"
  @change="handleDefaultColorChange" />
```

- [ ] **Step 4: 运行 Color Property 测试并确认通过**

Run: `npm run test:unit -- src/components/properties/dialogs/ColorPropertyDialog.test.ts src/components/properties/dialogs/canvasColorPalette.test.ts`

Expected: PASS，弹窗契约和颜色提取用例全部通过。

- [ ] **Step 5: 提交弹窗接线**

```bash
git add src/components/properties/dialogs/ColorPropertyDialog.vue src/components/properties/dialogs/ColorPropertyDialog.test.ts
git commit -m "feat: expose canvas colors in color properties"
```

### Task 4: 完整回归验证

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: 运行全部相关单元测试**

Run:

```bash
npm run test:unit -- \
  src/components/properties/dialogs/canvasColorPalette.test.ts \
  src/components/color-picker/colorSelection.test.ts \
  src/components/properties/dialogs/ColorPropertyDialog.test.ts \
  src/components/properties/dialogs/colorPropertyOptions.test.ts \
  src/utils/rgb565Color.test.ts
```

Expected: PASS，相关测试全部通过。

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS。若失败，先确认是否来自本任务开始前已存在的 `goalArc.renderer.ts` 未提交改动；不得把该文件纳入本功能提交。

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`

Expected: PASS，并生成 Vite production bundle。若基线改动导致失败，记录首个错误及所属文件，明确区分本功能与工作区已有问题。

- [ ] **Step 4: 检查变更范围和提交状态**

Run:

```bash
git status --short
git log -4 --oneline
```

Expected: 本功能文件已提交；用户原有的 `src/elements/goal/goalArc/goalArc.renderer.ts` 和 `src/elements/goal/goalArc/goalArc.renderer.update.test.ts` 保持原状且未被提交。

- [ ] **Step 5: 手动验证交互**

Run: `npm run dev`

Expected:

1. 打开包含多种元素颜色与渐变色的设计。
2. 创建或编辑 Color Property。
3. 打开 Default Value 颜色选择器，看到独立的 `Canvas Colors` 色块网格。
4. 悬停色块能看到十六进制值，点击后 Default Value 更新为对应 RGB565 值。
5. `Current Colors` 仍只显示已创建的 Color Property。
6. 打开普通元素设置中的颜色选择器，不出现 `Canvas Colors` 区域。
