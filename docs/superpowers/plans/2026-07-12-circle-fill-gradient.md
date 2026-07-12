# Circle Fill Gradient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为圆形元素实现与矩形一致的双色四方向线性渐变，并完整贯通 Studio、生成器模板和 Connect IQ 运行时。

**Architecture:** 把矩形现有的 Fabric 线性渐变辅助逻辑泛化为形状共用模块，圆形 renderer 继续保存独立的纯色回退值和渐变元数据。生成器对 rectangle/circle 共享字段规范化，Connect IQ `Circle.mc` 在圆形轮廓内按短切片绘制渐变，最后保持现有单色边框路径。

**Tech Stack:** Vue 3、TypeScript、Fabric.js、Vitest、Python unittest、Jinja2、Monkey C / Connect IQ

---

## 文件结构

- 修改 `src/types/elements/shape.ts`：让圆形和矩形共享渐变字段及方向类型。
- 修改 `src/elements/shapes/rectangle/rectangle.gradient.ts`：保持现有导出兼容，同时提供可供圆形复用的矩形包围盒线性渐变生成器。
- 新建 `src/elements/shapes/circle/circle.gradient.test.ts`：覆盖圆形直径对应的四方向 Fabric 坐标。
- 新建 `src/elements/shapes/circle/circle.encoder.test.ts`：覆盖渐变字段往返和旧数据回退。
- 修改 `src/elements/shapes/circle/circle.schema.ts`、`circle.panel.vue`、`circle.renderer.ts`、`circle.encoder.ts`：默认值、面板、预览、状态同步与持久化。
- 新建 `wristo-scaffold/tests/test_circle_gradient.py`：覆盖生成器、模板和运行时契约。
- 修改 `wristo-scaffold/super-extract-elements.py`：规范化 circle 渐变字段。
- 修改 `wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`：向 Circle 运行时传参。
- 修改 `wristo-apps/SuperBarrel/shapes/Circle.mc`：实现圆形范围内的线性渐变绘制。

### Task 1: Studio 类型、渐变坐标和编解码

**Files:**
- Modify: `wristo-studio/src/types/elements/shape.ts`
- Modify: `wristo-studio/src/elements/shapes/rectangle/rectangle.gradient.ts`
- Create: `wristo-studio/src/elements/shapes/circle/circle.gradient.test.ts`
- Create: `wristo-studio/src/elements/shapes/circle/circle.encoder.test.ts`
- Modify: `wristo-studio/src/elements/shapes/circle/circle.encoder.ts`

- [ ] **Step 1: 写圆形渐变坐标和编码器失败测试**

```ts
// circle.gradient.test.ts
import { describe, expect, it } from 'vitest'
import { createRectangleGradientSpec } from '../rectangle/rectangle.gradient'

describe('circle gradient', () => {
  it.each([
    ['leftToRight', { x1: 0, y1: 0, x2: 80, y2: 0 }],
    ['rightToLeft', { x1: 80, y1: 0, x2: 0, y2: 0 }],
    ['topToBottom', { x1: 0, y1: 0, x2: 0, y2: 80 }],
    ['bottomToTop', { x1: 0, y1: 80, x2: 0, y2: 0 }],
  ] as const)('maps %s across the full diameter', (direction, coords) => {
    expect(createRectangleGradientSpec({
      enabled: true, startColor: '#112233', endColor: '#AABBCC',
      direction, width: 80, height: 80,
    })?.coords).toEqual(coords)
  })
})
```

```ts
// circle.encoder.test.ts
import { describe, expect, it } from 'vitest'
import { decodeCircle, encodeCircle } from './circle.encoder'

const circle = (overrides = {}) => ({
  id: 'circle-test', eleType: 'circle', left: 10, top: 20, radius: 40,
  fill: '#123456', solidFill: '#123456', stroke: '#FFFFFF', strokeWidth: 2,
  opacity: 1, originX: 'center', originY: 'center', ...overrides,
} as any)

describe('circle encoder gradient fields', () => {
  it('round-trips gradient settings', () => {
    const encoded = encodeCircle(circle({
      gradientEnabled: true, gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC', gradientDirection: 'bottomToTop',
    }))
    expect(decodeCircle(encoded)).toMatchObject({
      fill: '#123456', gradientEnabled: true, gradientStartColor: '#112233',
      gradientEndColor: '#AABBCC', gradientDirection: 'bottomToTop',
    })
  })

  it('defaults legacy circles to disabled gradient using fill', () => {
    expect(decodeCircle(encodeCircle(circle({ solidFill: undefined })))).toMatchObject({
      fill: '#123456', gradientEnabled: false,
      gradientStartColor: '#123456', gradientEndColor: '#123456',
      gradientDirection: 'leftToRight',
    })
  })
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `cd wristo-studio && npx vitest run src/elements/shapes/circle/circle.gradient.test.ts src/elements/shapes/circle/circle.encoder.test.ts`

Expected: 编码器测试因缺少圆形渐变字段而 FAIL；坐标测试保持 PASS，证明复用的包围盒算法适用于直径。

- [ ] **Step 3: 增加共享渐变字段并实现最小编解码**

```ts
export type ShapeGradientDirection =
  | 'leftToRight' | 'rightToLeft' | 'topToBottom' | 'bottomToTop'

export interface ShapeGradientConfig {
  gradientEnabled?: boolean
  gradientStartColor?: string
  gradientEndColor?: string
  gradientDirection?: ShapeGradientDirection
}

export interface CircleElementConfig extends ShapeElementConfig, ShapeGradientConfig {
  eleType: 'circle'
  radius: number
}

export type RectangleGradientDirection = ShapeGradientDirection
export interface RectangleElementConfig extends ShapeElementConfig, ShapeGradientConfig {
  eleType: 'rectangle'
  width: number
  height: number
  borderRadius: number
}
```

在 `encodeCircle()` 中读取 `solidFill ?? fill`，保存四个渐变字段；在 `decodeCircle()` 中用解码后的 `fill` 补齐缺失起止色，并通过 `normalizeRectangleGradientDirection()` 规范化方向。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `cd wristo-studio && npx vitest run src/elements/shapes/circle/circle.gradient.test.ts src/elements/shapes/circle/circle.encoder.test.ts src/elements/shapes/rectangle/rectangle.gradient.test.ts src/elements/shapes/rectangle/rectangle.encoder.test.ts`

Expected: 4 个测试文件全部 PASS。

- [ ] **Step 5: 提交 Task 1 的精确文件**

```bash
git add src/types/elements/shape.ts src/elements/shapes/rectangle/rectangle.gradient.ts \
  src/elements/shapes/circle/circle.gradient.test.ts \
  src/elements/shapes/circle/circle.encoder.test.ts \
  src/elements/shapes/circle/circle.encoder.ts
git commit -m "add circle gradient data model"
```

### Task 2: Studio 圆形面板、默认值与 Fabric 预览

**Files:**
- Modify: `wristo-studio/src/elements/shapes/circle/circle.schema.ts`
- Modify: `wristo-studio/src/elements/shapes/circle/circle.panel.vue`
- Modify: `wristo-studio/src/elements/shapes/circle/circle.renderer.ts`

- [ ] **Step 1: 扩展编码器测试，先描述 renderer 必须保存的纯色回退契约**

```ts
it('encodes solidFill instead of a Fabric gradient object', () => {
  const encoded = encodeCircle(circle({
    fill: { type: 'linear', colorStops: [] },
    solidFill: '#123456',
    gradientEnabled: true,
    gradientStartColor: '#112233',
    gradientEndColor: '#AABBCC',
  }))
  expect(encoded.fill).toBe('#123456')
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `cd wristo-studio && npx vitest run src/elements/shapes/circle/circle.encoder.test.ts`

Expected: FAIL，输出 fill 不是纯色回退值。

- [ ] **Step 3: 实现默认值、面板和 renderer 状态同步**

在 schema 默认配置加入：

```ts
gradientEnabled: false,
gradientStartColor: 'transparent',
gradientEndColor: 'transparent',
gradientDirection: 'leftToRight',
```

在面板的填充 `ColorPicker` 上加入 `enable-gradient`、三个渐变 prop 和 `@gradient-change`；启用时显示与矩形完全相同的四方向下拉框。`handleGradientChange()` 一次性通过 `applyUpdate()` 提交四个字段。

在 renderer 增加 `applyCircleFill(circle)`：以 `diameter = radius * 2` 调用共享 Fabric 渐变生成器，成功时设置 Gradient，失败时设置 `solidFill`。创建、属性更新和缩放完成后调用它；元素仓库和 `initialConfig` 始终保存 `solidFill` 及四个渐变字段。

- [ ] **Step 4: 验证 Studio 测试、类型和构建**

Run: `cd wristo-studio && npx vitest run src/elements/shapes/circle src/elements/shapes/rectangle`

Expected: PASS。

Run: `cd wristo-studio && npm run typecheck`

Expected: exit 0。

Run: `cd wristo-studio && npm run build`

Expected: exit 0。

- [ ] **Step 5: 提交 Task 2 的精确文件**

```bash
git add src/elements/shapes/circle/circle.schema.ts \
  src/elements/shapes/circle/circle.panel.vue \
  src/elements/shapes/circle/circle.renderer.ts \
  src/elements/shapes/circle/circle.encoder.test.ts
git commit -m "support circle gradients in studio"
```

### Task 3: Connect IQ 提取、模板与圆形运行时

**Files:**
- Create: `wristo-connectiq-app-build/wristo-scaffold/tests/test_circle_gradient.py`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`
- Modify: `wristo-apps/SuperBarrel/shapes/Circle.mc`

- [ ] **Step 1: 写生成器和源码契约失败测试**

在 `test_circle_gradient.py` 使用与现有 rectangle 测试相同的临时配置执行入口，并加入以下具体测试：

```python
def test_legacy_circle_defaults_to_solid_left_to_right(self):
    result = self.extract({"eleType": "circle", "fill": "#123456"})
    self.assertEqual("false", result["gradientEnabled"])
    self.assertEqual("0x123456", result["gradientStartColor"])
    self.assertEqual("0x123456", result["gradientEndColor"])
    self.assertEqual("leftToRight", result["gradientDirection"])

def test_circle_gradient_accepts_four_directions(self):
    for direction in ("leftToRight", "rightToLeft", "topToBottom", "bottomToTop"):
        result = self.extract({
            "eleType": "circle", "fill": "#FFFFFF", "gradientEnabled": True,
            "gradientStartColor": "#FF0000", "gradientEndColor": "0x00FF00",
            "gradientDirection": direction,
        })
        self.assertEqual("true", result["gradientEnabled"])
        self.assertEqual(direction, result["gradientDirection"])

def test_circle_template_and_runtime_expose_gradient_contract(self):
    template = TEMPLATE.read_text(encoding="utf-8")
    start = template.index('{% if element.eleType == "circle" %}')
    block = template[start:]
    runtime = RUNTIME.read_text(encoding="utf-8")
    for key in (":gradientEnabled", ":gradientStartColor", ":gradientEndColor", ":gradientDirection"):
        self.assertIn(key, block)
        self.assertIn(key, runtime)
    for token in ("MAX_GRADIENT_SLICES", "function interpolateColor", "function drawGradientFill"):
        self.assertIn(token, runtime)
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `cd wristo-connectiq-app-build && python3 -m unittest wristo-scaffold/tests/test_circle_gradient.py -v`

Expected: FAIL，当前 circle 提取结果、模板和运行时均缺少渐变契约。

- [ ] **Step 3: 实现提取与模板透传**

把 extractor 的 rectangle 条件扩展为 `element.get("eleType") in ("rectangle", "circle")`，复用当前四方向白名单、颜色回退和 Monkey C 字符串字面量。Circle 模板 options 增加：

```monkeyc
:gradientEnabled => {{ element.gradientEnabled }},
:gradientStartColor => {{ element.gradientStartColor }},
:gradientEndColor => {{ element.gradientEndColor }},
:gradientDirection => {{ element.gradientDirectionLiteral }}
```

- [ ] **Step 4: 实现 Circle.mc 的最小渐变绘制**

扩展 `CustomOpt` 和 `defaultOpt`，合并四个字段。`interpolateColor()` 显式把 `Math.round()` 结果转成 `toNumber()` 后再位运算，避免运行时 Float/Number 类型异常。`drawGradientFill()` 将直径按最多 90 个窄切片处理：横向方向按每个 x 切片计算圆方程对应的半弦高并 `fillRectangle`；纵向方向按 y 切片计算半弦宽。每个切片颜色先调用 `ColorUtils.colorWithOpacity()`，只在圆边界内绘制；随后沿用现有 `drawCircle()` 单色边框。

- [ ] **Step 5: 运行生成器和运行时契约测试并确认 GREEN**

Run: `cd wristo-connectiq-app-build && python3 -m unittest wristo-scaffold/tests/test_circle_gradient.py wristo-scaffold/tests/test_rectangle_gradient.py -v`

Expected: circle 和 rectangle 测试全部 PASS。

- [ ] **Step 6: 分仓库提交精确文件**

```bash
cd wristo-connectiq-app-build
git add wristo-scaffold/super-extract-elements.py wristo-scaffold/tests/test_circle_gradient.py
git commit -m "extract circle gradient settings"

cd ../wristo-apps/SuperAlpha
git add source/SuperAlphaView.j2.mc
git commit -m "pass circle gradients to runtime"

cd ../SuperBarrel
git add shapes/Circle.mc
git commit -m "render circle fill gradients"
```

### Task 4: 全链路回归验证

**Files:**
- Verify only; do not edit generated outputs.

- [ ] **Step 1: 检查三个仓库差异边界**

Run: `git -C wristo-studio diff --check && git -C wristo-connectiq-app-build diff --check && git -C wristo-apps/SuperAlpha diff --check && git -C wristo-apps/SuperBarrel diff --check`

Expected: 无 whitespace error；不暂存或覆盖任务开始前已有改动。

- [ ] **Step 2: 运行 Studio 全量相关验证**

Run: `cd wristo-studio && npx vitest run && npm run typecheck && npm run build`

Expected: 全部 exit 0。

- [ ] **Step 3: 运行 scaffold 测试**

Run: `cd wristo-connectiq-app-build && python3 -m unittest discover -s wristo-scaffold/tests -p 'test_*.py' -v`

Expected: 全部 PASS。

- [ ] **Step 4: 构建一个现有 SuperAlpha 目标设备**

使用仓库 README 中现有构建入口生成一个目标设备，禁止手改 `generated` 目录。Expected: `BUILD SUCCESSFUL`。若本机模拟器不可用，最终交付明确标注未做视觉运行时确认。

- [ ] **Step 5: 最终状态审计**

Run: `git -C wristo-studio status --short && git -C wristo-connectiq-app-build status --short && git -C wristo-apps/SuperAlpha status --short && git -C wristo-apps/SuperBarrel status --short`

Expected: 能明确区分本任务提交与任务开始前已有的用户改动，不包含生成目录和无关文件。
