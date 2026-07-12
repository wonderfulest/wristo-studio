# SubDial Content Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 SubDial 绑定通用进度数据，并支持 icon、label、value、unit、goal/range 和 percentage 六个内部内容项独立显示、设置样式和拖拽布局。

**Architecture:** Studio 保持 SubDial 为单一 Fabric Group，通过专用 `SubDialLayoutEditor` 编辑稳定的内部 children，所有位置按半径归一化。Connect IQ 保留现有七项 Data 数组并追加可选 `progressMeta`，由 `DataFetcher.getProgressDataByName()` 统一产生 goal/range/custom 进度 Dictionary，模板只取数一次并交给 `SubDial.draw()`。

**Tech Stack:** Vue 3、TypeScript、Fabric.js、Pinia、Vitest、Python unittest、Jinja2、Monkey C、Connect IQ SDK 9.2.0

---

## 文件结构

### `wristo-studio`

- Modify: `src/types/elements/subDial.ts` — 新配置类型和内容项类型。
- Modify: `src/elements/dials/subDial/subDial.schema.ts` — 新默认配置和 Classic 布局。
- Create: `src/elements/dials/subDial/subDial.migration.ts` — 旧 `goalProperty`、value、unit 配置迁移。
- Create: `src/elements/dials/subDial/subDial.progress.ts` — Studio 预览进度归一化。
- Create: `src/elements/dials/subDial/subDial.layout.ts` — 局部坐标转换、圆形约束和布局预设。
- Create: `src/elements/dials/subDial/SubDialLayoutEditor.ts` — 内部编辑会话和拖拽状态。
- Modify: `src/elements/dials/subDial/subDial.encoder.ts` — 编解码与迁移入口。
- Modify: `src/elements/dials/subDial/subDial.renderer.ts` — 稳定 static/content children 和内部命中对象。
- Modify: `src/elements/dials/subDial/subDial.panel.vue` — Data、Dial、Content、Layout 四组设置。
- Modify: `src/elements/dials/subDial/subDial.panelModel.ts` — 内容项 patch 和预设 patch。
- Modify: `src/elements/dials/subDial/subDial.plugin.ts` — 注册/释放布局编辑器。
- Modify: `src/views/Canvas.vue` — 双击、Esc 和外部选择退出的最小接入。
- Modify: `src/i18n.ts` — 英文用户文案和中文编辑器文案。

### `wristo-connectiq-app-build/wristo-scaffold`

- Modify: `super-extract-elements.py` — 规范化 `progressProperty` 和六项内容配置。
- Modify: `tests/test_sub_dial.py` — 新旧配置和内容项提取测试。
- Modify: `tests/test_sub_dial_template.py` — 单次进度查询和 Dictionary 绘制测试。
- Create: `tests/test_sub_dial_progress_runtime.py` — DataFetcher/SubDial 源码契约测试。

### `wristo-apps`

- Modify: `SuperBarrel/utils/DataProvider.mc` — Data 第八项 `progressMeta` 和典型 provider 元数据。
- Modify: `SuperBarrel/utils/DataFetcher.mc` — `getProgressDataByName()`。
- Modify: `SuperBarrel/dials/SubDial.mc` — Dictionary 数据、六项内容和刻度标签绘制。
- Modify: `SuperAlpha/source/SuperAlphaView.j2.mc` — 每个 SubDial 单次获取进度数据。

## Task 1: 定义 Studio 新配置和默认布局

**Files:**
- Modify: `src/types/elements/subDial.ts`
- Modify: `src/elements/dials/subDial/subDial.schema.ts`
- Test: `src/elements/dials/subDial/subDial.encoder.test.ts`

- [ ] **Step 1: 写失败测试**

在 `subDial.encoder.test.ts` 增加：

```ts
it('provides six normalized content items by default', () => {
  const config = encodeSubDial({ id: 'sd', eleType: 'subDial' } as any)
  expect(config.progressProperty).toBe('')
  expect(Object.keys(config.content)).toEqual([
    'icon', 'label', 'value', 'unit', 'goalValue', 'percentage',
  ])
  expect(config.content.value).toMatchObject({ visible: true, x: 0, y: 0.2 })
  expect(config.content.percentage).toMatchObject({ visible: true })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.encoder.test.ts`

Expected: FAIL，`progressProperty` 或 `content` 不存在。

- [ ] **Step 3: 增加类型**

在 `subDial.ts` 定义并用于 `SubDialElementConfig`：

```ts
export type SubDialProgressMode = 'auto' | 'goal' | 'range' | 'custom'
export type SubDialContentKey = 'icon' | 'label' | 'value' | 'unit' | 'goalValue' | 'percentage'

export interface SubDialContentBaseConfig {
  visible: boolean
  x: number
  y: number
  rotation: number
  scale: number
}

export interface SubDialTextItemConfig extends SubDialContentBaseConfig {
  color: string
  font: string
  fontSize: number
  textAlign: 'left' | 'center' | 'right'
  prefix: string
  suffix: string
  decimals: number
}

export interface SubDialIconItemConfig extends SubDialContentBaseConfig {
  displayType: 'auto' | 'mip' | 'amoled'
  color: string
  size: number
}

export interface SubDialContentConfig {
  icon: SubDialIconItemConfig
  label: SubDialTextItemConfig
  value: SubDialTextItemConfig
  unit: SubDialTextItemConfig
  goalValue: SubDialTextItemConfig
  percentage: SubDialTextItemConfig
}
```

将旧 `goalProperty`、`showValue`、`showUnit`、`unit`、`decimals`、`valueColor`、`valueFontSize` 从新接口移除，加入：

```ts
progressProperty: string
progressMode: SubDialProgressMode
customMin: number
customMax: number
content: SubDialContentConfig
```

- [ ] **Step 4: 写入 Classic 默认布局**

在 schema 使用共享文本默认值创建六项配置：

```ts
const textItem = (visible: boolean, x: number, y: number, fontSize: number) => ({
  visible, x, y, rotation: 0, scale: 1,
  color: '#FFFFFF', font: '', fontSize, textAlign: 'center' as const,
  prefix: '', suffix: '', decimals: 0,
})

content: {
  icon: { visible: true, x: 0, y: -0.5, rotation: 0, scale: 1, displayType: 'auto', color: '#FFFFFF', size: 14 },
  label: textItem(true, 0, 0.55, 10),
  value: textItem(true, 0, 0.2, 14),
  unit: textItem(true, 0.42, 0.2, 10),
  goalValue: textItem(false, -0.35, 0.72, 9),
  percentage: { ...textItem(true, 0.35, 0.72, 9), suffix: '%' },
}
```

- [ ] **Step 5: 运行测试和类型检查**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.encoder.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/types/elements/subDial.ts src/elements/dials/subDial/subDial.schema.ts src/elements/dials/subDial/subDial.encoder.test.ts
git commit -m "定义小表盘内容配置"
```

## Task 2: 实现旧设计迁移和新编解码

**Files:**
- Create: `src/elements/dials/subDial/subDial.migration.ts`
- Create: `src/elements/dials/subDial/subDial.migration.test.ts`
- Modify: `src/elements/dials/subDial/subDial.encoder.ts`
- Test: `src/elements/dials/subDial/subDial.encoder.test.ts`

- [ ] **Step 1: 写迁移失败测试**

```ts
it('migrates legacy goal and value fields into content', () => {
  const migrated = migrateSubDialConfig({
    id: 'legacy', eleType: 'subDial', goalProperty: 'steps',
    showValue: false, showUnit: true, unit: 'STEPS', decimals: 1,
    valueColor: '#00FF00', valueFontSize: 18,
  } as any)
  expect(migrated.progressProperty).toBe('steps')
  expect(migrated.content.value).toMatchObject({ visible: false, decimals: 1, color: '#00FF00', fontSize: 18 })
  expect(migrated.content.unit).toMatchObject({ visible: true, suffix: 'STEPS' })
  expect(migrated).not.toHaveProperty('goalProperty')
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.migration.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现纯函数迁移器**

导出：

```ts
export function migrateSubDialConfig(input: Record<string, any>): SubDialElementConfig {
  const defaults = structuredClone(subDialSchema.defaultConfig)
  const legacyValue = {
    visible: input.showValue ?? defaults.content.value.visible,
    decimals: input.decimals ?? defaults.content.value.decimals,
    color: input.valueColor ?? defaults.content.value.color,
    fontSize: input.valueFontSize ?? defaults.content.value.fontSize,
  }
  return {
    ...defaults,
    ...input,
    progressProperty: String(input.progressProperty ?? input.goalProperty ?? ''),
    progressMode: input.progressMode ?? 'auto',
    content: {
      ...defaults.content,
      ...(input.content ?? {}),
      value: { ...defaults.content.value, ...legacyValue, ...(input.content?.value ?? {}) },
      unit: {
        ...defaults.content.unit,
        visible: input.showUnit ?? defaults.content.unit.visible,
        suffix: String(input.unit ?? defaults.content.unit.suffix),
        ...(input.content?.unit ?? {}),
      },
    },
  } as SubDialElementConfig
}
```

返回前用对象解构删除旧字段，避免重新保存旧契约。

- [ ] **Step 4: encoder/decode 接入迁移**

`encodeSubDial()` 先合并 live/stored 后调用迁移器；`decodeSubDial()` 对输入调用迁移器，再返回 Fabric 属性。live 属性改为 `progressProperty`。

- [ ] **Step 5: 验证**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.migration.test.ts src/elements/dials/subDial/subDial.encoder.test.ts && npm run typecheck`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/elements/dials/subDial/subDial.migration.ts src/elements/dials/subDial/subDial.migration.test.ts src/elements/dials/subDial/subDial.encoder.ts src/elements/dials/subDial/subDial.encoder.test.ts
git commit -m "迁移小表盘旧配置"
```

## Task 3: 实现 Studio 进度数据模型

**Files:**
- Create: `src/elements/dials/subDial/subDial.progress.ts`
- Create: `src/elements/dials/subDial/subDial.progress.test.ts`

- [ ] **Step 1: 写四种模式测试**

```ts
it.each([
  ['goal', { value: 25, goal: 100 }, 25],
  ['range', { value: 70, min: 40, max: 180 }, 21.4285714286],
])('%s progress', (_name, input, expected) => {
  const result = resolveSubDialProgress({ mode: 'auto', ...input } as any)
  expect(result.percentage).toBeCloseTo(expected)
})

it('rejects an invalid range', () => {
  expect(resolveSubDialProgress({ mode: 'auto', value: 70, min: 180, max: 40 } as any))
    .toMatchObject({ valid: false, percentage: null })
})

it('uses custom range before source metadata', () => {
  expect(resolveSubDialProgress({ value: 50, goal: 200, min: 0, max: 200 }, {
    mode: 'custom', customMin: 40, customMax: 60,
  }).percentage).toBe(50)
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.progress.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现类型和解析器**

```ts
export interface SubDialProgressData {
  value: number | null
  displayValue: string
  icon: string | null
  label: string
  unit: string
  mode: 'goal' | 'range' | 'none'
  goal: number | null
  min: number | null
  max: number | null
  percentage: number | null
  valid: boolean
}
```

`resolveSubDialProgress()` 必须检查有限数值、`goal > 0` 和 `max > min`，保留未 clamp 的 percentage。

- [ ] **Step 4: 验证并提交**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.progress.test.ts`

Expected: PASS。

```bash
git add src/elements/dials/subDial/subDial.progress.ts src/elements/dials/subDial/subDial.progress.test.ts
git commit -m "统一小表盘进度模型"
```

## Task 4: 拆分稳定的 renderer children

**Files:**
- Modify: `src/elements/dials/subDial/subDial.renderer.ts`
- Modify: `src/elements/dials/subDial/subDial.renderer.test.ts`

- [ ] **Step 1: 写 child identity 和六项内容测试**

```ts
it('keeps content child identity during dynamic updates', async () => {
  const dial = await createSubDial(makeConfig()) as any
  const before = dial.__element.children.content.value
  await updateSubDial(dial, { previewValue: 75 } as any)
  expect(dial.__element.children.content.value).toBe(before)
})

it('creates all content children with stable keys', async () => {
  const dial = await createSubDial(makeConfig()) as any
  expect(Object.keys(dial.__element.children.content)).toEqual([
    'icon', 'label', 'value', 'unit', 'goalValue', 'percentage',
  ])
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.renderer.test.ts`

Expected: FAIL，children 尚无 `static/content`。

- [ ] **Step 3: 重构 children 类型**

```ts
type SubDialChildren = {
  static: {
    background: FabricObject
    majorTicks: Group
    minorTicks: Group
    tickLabels: Group
    pointer: FabricObject
    centerCap: FabricObject
  }
  content: Record<SubDialContentKey, FabricObject>
}
```

为每个内容对象设置 `subDialContentKey`，并用 `updateContentChildren(children.content, config, progress)` 原位更新 text、visible、left、top、angle、scale 和样式。

- [ ] **Step 4: 缩小结构重建范围**

删除全量 `needsStructuralRebuild()` 分支，改为：

```ts
const rebuildTicks = hasAny(patch, ['radius', 'majorTicks', 'minorTicks', 'showMajorTicks', 'showMinorTicks', 'showTickLabels', 'showEndpointTicks', 'startAngle', 'endAngle', 'counterClockwise'])
const rebuildPointer = patch.pointer !== undefined && hasAny(patch.pointer, ['style', 'imageUrl', 'assetId'])
```

只替换对应 static child，并保持 content 对象引用。

- [ ] **Step 5: 验证并提交**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.renderer.test.ts && npm run typecheck`

Expected: PASS。

```bash
git add src/elements/dials/subDial/subDial.renderer.ts src/elements/dials/subDial/subDial.renderer.test.ts
git commit -m "稳定小表盘内部对象"
```

## Task 5: 实现布局数学和预设

**Files:**
- Create: `src/elements/dials/subDial/subDial.layout.ts`
- Create: `src/elements/dials/subDial/subDial.layout.test.ts`

- [ ] **Step 1: 写坐标、边界和预设测试**

```ts
it('round trips normalized coordinates through a rotated group', () => {
  const canvasPoint = localToCanvas({ x: 0.5, y: -0.25 }, { centerX: 100, centerY: 120, radius: 40, rotation: 30 })
  expect(canvasToLocal(canvasPoint, { centerX: 100, centerY: 120, radius: 40, rotation: 30 })).toEqual({ x: 0.5, y: -0.25 })
})

it('keeps the item bounds inside the dial circle', () => {
  const result = constrainContentPosition({ x: 1, y: 1 }, { width: 20, height: 10 }, 50)
  expect(Math.hypot(result.x * 50, result.y * 50) + Math.hypot(10, 5)).toBeLessThanOrEqual(50)
})

it('classic preset changes layout without changing style', () => {
  const next = applySubDialLayoutPreset(config.content, 'classic')
  expect(next.value.color).toBe(config.content.value.color)
  expect(next.value.y).toBe(0.2)
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.layout.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现纯函数**

导出 `canvasToLocal()`、`localToCanvas()`、`constrainContentPosition()`、`lockDragAxis()` 和 `applySubDialLayoutPreset()`。旋转变换使用互为逆运算的 sin/cos；圆形约束使用内容包围盒半对角线作为安全半径。

- [ ] **Step 4: 验证并提交**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.layout.test.ts`

Expected: PASS。

```bash
git add src/elements/dials/subDial/subDial.layout.ts src/elements/dials/subDial/subDial.layout.test.ts
git commit -m "实现小表盘布局数学"
```

## Task 6: 实现 SubDialLayoutEditor

**Files:**
- Create: `src/elements/dials/subDial/SubDialLayoutEditor.ts`
- Create: `src/elements/dials/subDial/SubDialLayoutEditor.test.ts`
- Modify: `src/elements/dials/subDial/subDial.plugin.ts`
- Modify: `src/views/Canvas.vue`

- [ ] **Step 1: 写编辑会话测试**

```ts
it('enters on double click and commits one history state on drag end', () => {
  const editor = new SubDialLayoutEditor({ canvas, updateElement, saveHistory })
  editor.enter(group)
  editor.select('value')
  editor.beginDrag({ x: 100, y: 100 })
  editor.updateDrag({ x: 110, y: 100 }, { shiftKey: false })
  editor.updateDrag({ x: 120, y: 100 }, { shiftKey: false })
  editor.endDrag()
  expect(updateElement).toHaveBeenCalled()
  expect(saveHistory).toHaveBeenCalledTimes(1)
  expect(group.lockMovementX).toBe(true)
})

it('exits on escape and restores outer controls', () => {
  editor.enter(group)
  editor.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(editor.isEditing(group)).toBe(false)
  expect(group.lockMovementX).toBe(false)
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `npm run test:unit -- src/elements/dials/subDial/SubDialLayoutEditor.test.ts`

Expected: FAIL，类不存在。

- [ ] **Step 3: 实现编辑器公开接口**

```ts
export class SubDialLayoutEditor {
  enter(group: Group): void
  exit(): void
  isEditing(group?: Group): boolean
  select(key: SubDialContentKey): void
  beginDrag(point: Point): void
  updateDrag(point: Point, modifiers: { shiftKey: boolean }): void
  endDrag(): Promise<void>
  center(axis: 'horizontal' | 'vertical' | 'both'): Promise<void>
  resetSelectedPosition(): Promise<void>
  handleKeyDown(event: KeyboardEvent): void
  dispose(): void
}
```

编辑器保存进入前的 controls/locks；拖动期间只更新 child 预览；结束时调用一次 element manager patch 和 `historyStore.saveState('sub-dial:content-drag')`。

- [ ] **Step 4: 接入 Canvas 生命周期**

在 `Canvas.vue` 的 Fabric `mouse:dblclick` 事件中仅对 `eleType === 'subDial'` 调用 `enter()`；selection changed 到其他对象时 `exit()`；组件卸载时 `dispose()`。不要把 subDial children 注册到 layer store。

- [ ] **Step 5: 验证并提交**

Run: `npm run test:unit -- src/elements/dials/subDial/SubDialLayoutEditor.test.ts src/elements/dials/subDial/subDial.renderer.test.ts && npm run typecheck`

Expected: PASS。

```bash
git add src/elements/dials/subDial/SubDialLayoutEditor.ts src/elements/dials/subDial/SubDialLayoutEditor.test.ts src/elements/dials/subDial/subDial.plugin.ts src/views/Canvas.vue
git commit -m "支持小表盘内部拖拽"
```

## Task 7: 改造属性面板和文案

**Files:**
- Modify: `src/elements/dials/subDial/subDial.panel.vue`
- Modify: `src/elements/dials/subDial/subDial.panelModel.ts`
- Modify: `src/elements/dials/subDial/subDial.panel.test.ts`
- Modify: `src/elements/dials/subDial/subDial.panelModel.test.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: 写面板契约测试**

```ts
expect(source).toContain('progressProperty')
expect(source).toContain("['icon', 'label', 'value', 'unit', 'goalValue', 'percentage']")
expect(source).toContain('applyLayoutPreset')
expect(source).not.toContain('goalProperty')
```

在 panelModel 测试断言 `buildContentItemPatch('value', { x: 0.2 })` 只改 value，预设 patch 保留颜色和绑定。

- [ ] **Step 2: 运行并确认失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.panel.test.ts src/elements/dials/subDial/subDial.panelModel.test.ts`

Expected: FAIL，新字段和操作不存在。

- [ ] **Step 3: 实现四组面板**

Data 使用通用数据属性选择器绑定 `progressProperty`；Content 使用六项 segmented 选择器，分别渲染 icon 或 text 设置；Layout 提供 Classic、Compact、Goal Focus、水平居中、垂直居中和重置位置。

所有 patch 保持嵌套对象完整：

```ts
const patchContentItem = (key: SubDialContentKey, next: Record<string, unknown>) => patch({
  content: {
    ...model.value.content,
    [key]: { ...model.value.content[key], ...next },
  },
})
```

- [ ] **Step 4: 补齐中英文文案**

英文用户界面使用 `Data item`、`Progress mode`、`Goal / Range`、`Percentage`、`Edit inner layout`；中文对应 `数据项`、`进度模式`、`目标值 / 区间`、`百分比`、`编辑内部布局`。

- [ ] **Step 5: 验证并提交**

Run: `npm run test:unit -- src/elements/dials/subDial && npm run typecheck && npm run build`

Expected: PASS。

```bash
git add src/elements/dials/subDial/subDial.panel.vue src/elements/dials/subDial/subDial.panelModel.ts src/elements/dials/subDial/subDial.panel.test.ts src/elements/dials/subDial/subDial.panelModel.test.ts src/i18n.ts
git commit -m "完善小表盘内容设置"
```

## Task 8: 规范化脚手架配置

**Files:**
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial.py`

- [ ] **Step 1: 写新旧配置提取测试**

```python
self.assertEqual("steps", result["subDials"][0]["progressProperty"])
self.assertEqual("auto", result["subDials"][0]["progressMode"])
self.assertEqual(0.2, result["subDials"][0]["content"]["value"]["y"])
self.assertNotIn("goalProperty", result["subDials"][0])
```

增加 legacy fixture，仅含 `goalProperty/showValue/showUnit`，断言得到相同新结构。

- [ ] **Step 2: 运行并确认失败**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial -v`

Expected: FAIL，输出仍是旧 goal 配置。

- [ ] **Step 3: 修改 normalize_sub_dial**

读取 `progressProperty or goalProperty`；验证 `progressMode`；将六项内容规范化为固定 key Dictionary。每项限制 `x/y` 到 `-1～1`、`scale >= 0.01`、字号范围和合法对齐；颜色继续使用 `convert_color_to_hex()`；字符串生成对应 `Literal` 字段供 Jinja 使用。

- [ ] **Step 4: 验证并提交脚手架仓库**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial -v && python3 -m py_compile super-extract-elements.py`

Expected: PASS。

```bash
git add super-extract-elements.py tests/test_sub_dial.py
git commit -m "提取小表盘内容配置"
```

## Task 9: 扩展 DataProvider 和 DataFetcher

**Files:**
- Modify: `../wristo-apps/SuperBarrel/utils/DataProvider.mc`
- Modify: `../wristo-apps/SuperBarrel/utils/DataFetcher.mc`
- Create: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial_progress_runtime.py`

- [ ] **Step 1: 写源码契约测试**

```python
def test_progress_fetcher_supports_goal_and_range(self):
    source = DATA_FETCHER.read_text()
    self.assertIn("function getProgressDataByName", source)
    self.assertIn(":percentage", source)
    self.assertIn("DATA_PROGRESS_META", source)
    self.assertIn("maxValue > minValue", source)

def test_heart_rate_declares_range_metadata(self):
    source = DATA_PROVIDER.read_text()
    self.assertIn(":mode => :range", source)
    self.assertIn(":min =>", source)
    self.assertIn(":max =>", source)
```

- [ ] **Step 2: 运行并确认失败**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_progress_runtime -v`

Expected: FAIL，新接口不存在。

- [ ] **Step 3: 扩展 Data typedef 和常量**

将 Data 第八项定义为可选 Dictionary，并增加：

```monkeyc
const DATA_PROGRESS_META = 7;
```

Steps 等目标型 provider 返回 `{:mode => :goal, :goal => goal}`；Heart Rate 返回 `{:mode => :range, :min => 40, :max => 180}`。保留原七项含义和下标。

- [ ] **Step 4: 实现 getProgressDataByName**

接口先调用一次 `getValueByName(dataName)`，从同一 Data 构造 Dictionary。优先使用第八项元数据，缺失时从第三项目标值兼容推导。返回 `:valid => false` 而不是抛异常；percentage 不 clamp。

- [ ] **Step 5: 验证并提交 wristo-apps 仓库**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_progress_runtime -v`

Expected: PASS。

Run: `cd ../wristo-apps && git diff --check`

Expected: 无输出。

```bash
git add SuperBarrel/utils/DataProvider.mc SuperBarrel/utils/DataFetcher.mc
git commit -m "增加统一进度数据接口"
```

随后在脚手架仓库提交契约测试：

```bash
git add tests/test_sub_dial_progress_runtime.py
git commit -m "验证小表盘进度运行时"
```

## Task 10: 改造 SubDial 设备端绘制

**Files:**
- Modify: `../wristo-apps/SuperBarrel/dials/SubDial.mc`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial_progress_runtime.py`

- [ ] **Step 1: 写绘制契约测试**

断言 `draw()` 接收 `progressData as Dictionary`，源码包含六项 key、归一化位置换算、tick labels，并且不在 `SubDial.mc` 内调用 DataFetcher。

```python
self.assertIn("progressData as Dictionary", source)
for key in (":icon", ":label", ":value", ":unit", ":goalValue", ":percentage"):
    self.assertIn(key, source)
self.assertIn("config[:showTickLabels]", source)
self.assertNotIn("DataFetcher.get", source)
```

- [ ] **Step 2: 运行并确认失败**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_progress_runtime -v`

Expected: FAIL，draw 仍接收 Numeric。

- [ ] **Step 3: 实现内容绘制帮助函数**

增加 `contentPoint()`、`drawTextItem()`、`drawIconItem()`、`drawGoalOrRange()` 和 `drawTickLabels()`。位置统一使用 `center + normalized * radius`；每项先检查 `visible` 和数据可用性。goal 模式显示 goal，range 模式显示 `min + "-" + max`。

- [ ] **Step 4: 修改 draw 数据流**

`draw()` 从 `progressData[:percentage]` 得到指针进度；无效时跳过指针、goal 和 percentage，但继续绘制 icon、label、value、unit。绘制顺序严格按 spec：背景/刻度、icon、label、指针、中心盖、value、unit、goal、percentage。

- [ ] **Step 5: 验证并分别提交**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_progress_runtime -v`

Expected: PASS。

```bash
cd ../wristo-apps
git add SuperBarrel/dials/SubDial.mc
git commit -m "绘制小表盘内容布局"
```

```bash
cd ../wristo-connectiq-app-build/wristo-scaffold
git add tests/test_sub_dial_progress_runtime.py
git commit -m "验证小表盘内容绘制"
```

## Task 11: 修改模板为单次进度查询

**Files:**
- Modify: `../wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial_template.py`

- [ ] **Step 1: 更新失败测试**

```python
self.assertIn('DataFetcher.getProgressDataByName("steps")', source)
self.assertEqual(1, source.count('DataFetcher.getProgressDataByName("steps")'))
self.assertIn("SubDial.draw(", source)
self.assertNotIn("DATA_GOAL", source[source.index("SubDial.draw("):])
```

- [ ] **Step 2: 运行并确认失败**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_template -v`

Expected: FAIL，模板仍直接计算 goal ratio。

- [ ] **Step 3: 修改模板**

每个 dial 生成稳定局部变量：

```monkeyc
var subDialProgress{{ loop.index }} = DataFetcher.getProgressDataByName({{ dial.progressPropertyLiteral }});
SubDial.draw(dc, subDialConfig{{ loop.index }}, subDialProgress{{ loop.index }}, subDialCache);
```

配置 Dictionary 包含 `progressMode/customMin/customMax/content/showTickLabels`，图片指针资源逻辑保持不变。

- [ ] **Step 4: 验证并分别提交**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_template -v`

Expected: PASS。

```bash
cd ../wristo-apps
git add SuperAlpha/source/SuperAlphaView.j2.mc
git commit -m "接入小表盘进度数据"
```

```bash
cd ../wristo-connectiq-app-build/wristo-scaffold
git add tests/test_sub_dial_template.py
git commit -m "验证小表盘模板数据流"
```

## Task 12: 全链路回归和实际构建

**Files:**
- Modify when needed: `../wristo-connectiq-app-build/wristo-scaffold/tests/fixtures/sub-dial-design.json`

- [ ] **Step 1: 更新 fixture**

fixture 至少包含：

- Steps goal 型 SubDial，六项内容启用。
- Heart Rate range 型 SubDial，Goal 项显示区间。
- 自定义图片指针 SubDial。
- 一个旧 `goalProperty` 配置用于迁移。

- [ ] **Step 2: 运行 Studio 回归**

Run: `npm run test:unit -- src/elements/dials/subDial src/components/panels/AddElementPanel.test.ts && npm run typecheck && npm run build`

Expected: 全部 PASS。

- [ ] **Step 3: 运行脚手架回归**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest discover -s tests -v && python3 -m py_compile super-extract-elements.py lib/prune_data_providers.py && bash -n generate-project.sh lib/deal_sub_dial_pointer.sh lib/import-super-barrel.sh`

Expected: 全部 PASS，shell 和 Python 静态检查无输出。

- [ ] **Step 4: 生成测试项目**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && ./generate-project.sh tests/fixtures/sub-dial-design.json /tmp/wristo-sub-dial-content`

Expected: 生成项目包含 `SubDial.mc`、六项 content 配置、图片 drawable，日志无缺失资源错误。

- [ ] **Step 5: 使用 SDK 9.2.0 构建**

使用仓库现有 Connect IQ 构建入口和本机 `connectiq-sdk-mac-9.2.0-2026-06-09-92a1605b2`。先运行 `monkeyc --version` 确认 9.2.0，再构建生成项目。

Expected: Monkey C 编译成功，无类型、资源或超出内存错误。

- [ ] **Step 6: 手动验收**

在 Studio 验证双击进入、六项切换、拖拽、Shift 锁轴、Esc 退出、整体旋转缩放、保存重开和撤销。设备端对比 Steps 的 0/50/100% 和 Heart Rate 的 min/mid/max，指针角度误差不超过 1°。

- [ ] **Step 7: 提交 fixture**

```bash
cd ../wristo-connectiq-app-build/wristo-scaffold
git add tests/fixtures/sub-dial-design.json
git commit -m "补充小表盘内容回归样例"
```

## 完成检查

- [ ] `git diff --check` 在 `wristo-studio`、`wristo-connectiq-app-build` 和 `wristo-apps` 三个仓库均无输出。
- [ ] 三个仓库只包含本计划范围内的提交，不带入开始执行前的未提交修改。
- [ ] 设计规格中的配置、内部编辑、数据契约、绘制降级、迁移、测试和验收要求都有对应任务。
