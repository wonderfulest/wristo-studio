# Color Property RGB565 Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让颜色属性的默认颜色覆盖完整 RGB565 色域，同时把用户可切换候选项固定为 Default、现有 64 色和 Transparent。

**Architecture:** 新建一个无 UI 依赖的颜色属性工具模块，集中负责颜色解析、RGB565 量化和固定 options 构建；`ColorPropertyDialog.vue` 只负责表单交互，并在初始化、默认颜色变化和提交时调用该模块。继续使用 option 的实际 number 值表达 Default，不修改 Connect IQ 模板或 runtime 协议。

**Tech Stack:** Vue 3 Composition API、TypeScript、Pinia、Element Plus、Vitest、Vite

---

## 文件结构

- 新建 `src/components/properties/dialogs/colorPropertyOptions.ts`：RGB565 量化、默认颜色规范化和固定候选集合构建。
- 新建 `src/components/properties/dialogs/colorPropertyOptions.test.ts`：纯函数边界、幂等性和旧 options 清理测试。
- 修改 `src/stores/properties.ts`：把 64 个标准色与透明色分开暴露，供固定候选构建复用。
- 修改 `src/components/properties/dialogs/ColorPropertyDialog.vue`：默认颜色自由选择、RGB565 同步、只读 options 和提交时重建。
- 新建 `src/components/properties/dialogs/ColorPropertyDialog.test.ts`：对话框静态交互契约测试。

### Task 1: RGB565 与固定候选集合

**Files:**
- Create: `src/components/properties/dialogs/colorPropertyOptions.ts`
- Create: `src/components/properties/dialogs/colorPropertyOptions.test.ts`
- Modify: `src/stores/properties.ts`

- [ ] **Step 1: 写 RGB565 量化失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeRgb565GarminColor } from './colorPropertyOptions'

describe('normalizeRgb565GarminColor', () => {
  it.each([
    ['#000000', '0x000000'],
    ['#ffffff', '0xffffff'],
    ['0x123456', '0x103452'],
    ['abcdef', '0xadcfef'],
    ['', '0xffffff'],
    ['transparent', '0xffffff'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeRgb565GarminColor(input)).toBe(expected)
  })

  it('is idempotent', () => {
    const once = normalizeRgb565GarminColor('#39a7d4')
    expect(normalizeRgb565GarminColor(once)).toBe(once)
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:unit -- src/components/properties/dialogs/colorPropertyOptions.test.ts`

Expected: FAIL，提示 `colorPropertyOptions` 模块或导出不存在。

- [ ] **Step 3: 实现最小 RGB565 量化函数**

```ts
const WHITE = 'ffffff'

const parseRgbHex = (value: unknown): string => {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(?:#|0x)?([0-9a-fA-F]{6})$/)
  return match?.[1].toLowerCase() ?? WHITE
}

const expand5 = (value: number) => (value << 3) | (value >> 2)
const expand6 = (value: number) => (value << 2) | (value >> 4)

export const normalizeRgb565GarminColor = (value: unknown): string => {
  const hex = parseRgbHex(value)
  const red = expand5(Math.round(parseInt(hex.slice(0, 2), 16) * 31 / 255))
  const green = expand6(Math.round(parseInt(hex.slice(2, 4), 16) * 63 / 255))
  const blue = expand5(Math.round(parseInt(hex.slice(4, 6), 16) * 31 / 255))
  return `0x${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}
```

- [ ] **Step 4: 运行量化测试并校正精确预期**

Run: `npm run test:unit -- src/components/properties/dialogs/colorPropertyOptions.test.ts`

Expected: PASS。若手算样例与公式输出不一致，只通过独立 RGB565 编码/解码计算修正测试常量，不修改量化公式迎合错误常量。

- [ ] **Step 5: 写固定候选集合失败测试**

在同一测试文件增加：

```ts
import { buildColorPropertyOptions } from './colorPropertyOptions'

const standard = [
  { label: 'White', value: '0xFFFFFF' },
  { label: 'Black', value: '0x000000' },
]

it('builds Default, standard colors, and Transparent in fixed order', () => {
  expect(buildColorPropertyOptions('#123456', standard)).toEqual([
    { label: 'Default', value: '0x103452' },
    ...standard,
    { label: 'Transparent', value: '-1' },
  ])
})

it('keeps Default and removes a matching standard color', () => {
  expect(buildColorPropertyOptions('#ffffff', standard)).toEqual([
    { label: 'Default', value: '0xffffff' },
    { label: 'Black', value: '0x000000' },
    { label: 'Transparent', value: '-1' },
  ])
})

it('ignores legacy custom options by rebuilding from standards', () => {
  const result = buildColorPropertyOptions('#abcdef', standard)
  expect(result.some((option) => option.label.startsWith('Custom'))).toBe(false)
  expect(result).toHaveLength(4)
})
```

- [ ] **Step 6: 运行测试并确认固定集合测试失败**

Run: `npm run test:unit -- src/components/properties/dialogs/colorPropertyOptions.test.ts`

Expected: FAIL，提示 `buildColorPropertyOptions` 不存在。

- [ ] **Step 7: 拆分 store 标准色并实现固定集合构建**

在 `src/stores/properties.ts` 中让 `defaultColorOptions` 只保留现有 64 个标准色，移除末尾 Transparent；getter 名称保持不变以缩小调用面。

在工具模块增加：

```ts
import type { PropertyOption } from '@/types/properties'

export const buildColorPropertyOptions = (
  defaultColor: unknown,
  standardColors: PropertyOption[],
): PropertyOption[] => {
  const defaultValue = normalizeRgb565GarminColor(defaultColor)

  return [
    { label: 'Default', value: defaultValue },
    ...standardColors
      .filter((option) => normalizeRgb565GarminColor(option.value) !== defaultValue)
      .map((option) => ({ ...option })),
    { label: 'Transparent', value: '-1' },
  ]
}
```

- [ ] **Step 8: 运行工具测试**

Run: `npm run test:unit -- src/components/properties/dialogs/colorPropertyOptions.test.ts`

Expected: PASS，全部测试通过。

- [ ] **Step 9: 提交工具层**

```bash
git add src/stores/properties.ts src/components/properties/dialogs/colorPropertyOptions.ts src/components/properties/dialogs/colorPropertyOptions.test.ts
git commit -m "支持颜色属性 RGB565 默认值"
```

### Task 2: 颜色属性对话框接入

**Files:**
- Modify: `src/components/properties/dialogs/ColorPropertyDialog.vue`
- Create: `src/components/properties/dialogs/ColorPropertyDialog.test.ts`

- [ ] **Step 1: 写只读候选和 RGB565 接入失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('ColorPropertyDialog contract', () => {
  const source = readFileSync(new URL('./ColorPropertyDialog.vue', import.meta.url), 'utf8')

  it('uses the RGB565 fixed option helpers', () => {
    expect(source).toContain('normalizeRgb565GarminColor')
    expect(source).toContain('buildColorPropertyOptions')
    expect(source).not.toContain('ensureOptionForColorValue')
  })

  it('renders color options as read-only values', () => {
    expect(source).not.toContain('@click="addOption"')
    expect(source).not.toContain('v-model="option.label"')
    expect(source).not.toContain('v-model="option.value"')
    expect(source).not.toContain('@click="deleteOption(index)"')
    expect(source).toContain('option.label')
    expect(source).toContain('option.value')
  })
})
```

- [ ] **Step 2: 运行对话框契约测试并确认失败**

Run: `npm run test:unit -- src/components/properties/dialogs/ColorPropertyDialog.test.ts`

Expected: FAIL，现有对话框仍包含 Add、编辑、删除和旧的 custom option 逻辑。

- [ ] **Step 3: 将候选列表改为只读展示**

删除 `Plus`、`ArrowUp`、`ArrowDown`、`Delete` 图标依赖及 Add Option 按钮、输入框、排序和删除操作。列表主体改为：

```vue
<div v-for="option in formData.options" :key="`${option.label}-${option.value}`" class="option-item">
  <div class="option-content">
    <span class="color-preview" :style="getOptionPreviewStyle(option.value)">
      <span v-if="option.value === '-1'" class="transparent-pattern" />
    </span>
    <span class="option-label">{{ option.label }}</span>
    <code class="option-value">{{ option.value }}</code>
  </div>
</div>
```

- [ ] **Step 4: 接入 RGB565 默认颜色与固定集合**

导入工具函数：

```js
import {
  buildColorPropertyOptions,
  normalizeRgb565GarminColor,
} from './colorPropertyOptions'
```

用统一同步函数替换“默认值必须位于 options 中”的旧逻辑：

```js
const syncDefaultColor = (value) => {
  const normalized = normalizeRgb565GarminColor(value)
  formData.value = normalized
  defaultColorHex.value = `#${normalized.slice(2)}`
  formData.options = buildColorPropertyOptions(
    normalized,
    propertiesStore.getDefaultColorOptions,
  )
}

const handleDefaultColorChange = (hex) => {
  syncDefaultColor(hex)
}
```

`initFormData()` 新建时使用 `lastSelectedColor` 或白色，编辑时使用已有 `data.value`；两条路径最后都调用 `syncDefaultColor()`，不读取旧 options 构建候选项。

- [ ] **Step 5: 提交前强制重建并简化验证**

`validateDefaultValue` 只检查值等于自身 RGB565 规范化结果；`validateOptions` 检查 options 与 `buildColorPropertyOptions(formData.value, propertiesStore.getDefaultColorOptions)` 深度一致。`handleConfirm()` 在 `validate()` 前调用 `syncDefaultColor(formData.value)`，保证旧数据或临时异常状态不能进入 emit payload。

- [ ] **Step 6: 运行对话框与工具测试**

Run: `npm run test:unit -- src/components/properties/dialogs/ColorPropertyDialog.test.ts src/components/properties/dialogs/colorPropertyOptions.test.ts`

Expected: PASS，两个测试文件全部通过。

- [ ] **Step 7: 运行格式检查并提交 UI**

Run: `npx prettier --check src/components/properties/dialogs/ColorPropertyDialog.vue src/components/properties/dialogs/ColorPropertyDialog.test.ts src/components/properties/dialogs/colorPropertyOptions.ts src/components/properties/dialogs/colorPropertyOptions.test.ts src/stores/properties.ts`

Expected: PASS；若失败，运行同一文件列表的 `npx prettier --write ...` 后重新检查。

```bash
git add src/components/properties/dialogs/ColorPropertyDialog.vue src/components/properties/dialogs/ColorPropertyDialog.test.ts
git commit -m "限制颜色属性候选集合"
```

### Task 3: 回归验证

**Files:**
- Verify: `src/components/properties/dialogs/colorPropertyOptions.test.ts`
- Verify: `src/components/properties/dialogs/ColorPropertyDialog.test.ts`
- Verify: `src/stores/properties.ts`
- Verify: `src/components/properties/dialogs/ColorPropertyDialog.vue`

- [ ] **Step 1: 运行全部相关单元测试**

Run: `npm run test:unit -- src/components/properties/dialogs/colorPropertyOptions.test.ts src/components/properties/dialogs/ColorPropertyDialog.test.ts`

Expected: PASS，全部相关测试通过。

- [ ] **Step 2: 运行 TypeScript 和生产构建验证**

Run: `npm run build`

Expected: `vue-tsc --noEmit` 与 `vite build --mode prod` 均成功，退出码为 0。

- [ ] **Step 3: 检查 diff 完整性**

Run: `git diff --check HEAD~2..HEAD`

Expected: 无输出，退出码为 0。

- [ ] **Step 4: 手工验证关键交互**

Run: `npm run dev`

Expected:

- 新建颜色属性时默认显示白色，候选集合为 65 项：Default、其余 63 色、Transparent；White 标准色因与 Default 重复而被过滤。
- 输入非 64 色（例如 `#123456`）后显示量化后的 `#103452`，Default 项同步为 `0x103452`。
- 候选项没有新增、编辑、排序和删除控件。
- 编辑带 Custom option 的旧颜色属性并保存后，Custom option 不再出现在 payload 中。
- 导出的 settings 列表保留 Default、不重复的标准色和 Transparent，Default 使用实际颜色数值而非新哨兵值。

- [ ] **Step 5: 记录验证结果**

若手工验证无需代码修复，不创建空提交；在任务交付说明中记录测试、构建和手工验证结果。若发现问题，先补充能复现问题的失败测试，再最小修复并单独提交。
