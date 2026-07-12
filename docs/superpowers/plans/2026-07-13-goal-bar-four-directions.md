# GoalBar Four Directions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展单一 GoalBar，使连续、分段、自定义多边形和渐变前景在 Studio 与 Connect IQ Runtime 中一致支持四种进度方向，并兼容旧 `progressAlign` 配置。

**Architecture:** 使用 `progressDirection` 作为唯一持久化方向字段，通过纯函数方向模型统一主轴和反向语义。Studio renderer 与 SuperBarrel Runtime 按同一契约实现轴向尺寸、裁剪、分段顺序和渐变；scaffold 负责旧字段迁移和模板透传。

**Tech Stack:** Vue 3、TypeScript、Fabric.js、Vitest、Python unittest、Jinja、Garmin Monkey C

---

## 文件结构

- Create: `wristo-studio/src/elements/goal/goalBar/goalBar.direction.ts` — 四方向归一化及轴向模型。
- Create: `wristo-studio/src/elements/goal/goalBar/goalBar.direction.test.ts` — 新旧方向配置测试。
- Modify: `wristo-studio/src/types/elements/goal.ts`、`goalBar.schema.ts`、`goalBar.encoder.ts` — 持久化契约。
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.panel.vue`、`src/i18n.ts` — 四方向设置。
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.geometry.ts`、`goalBar.gradient.ts`、`goalBar.renderer.ts` — 轴向绘制。
- Modify: `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py` — 导出及旧配置迁移。
- Modify: `wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc` — 模板参数。
- Modify: `wristo-apps/SuperBarrel/goal/GoalBar.mc` — Monkey C 四方向 Runtime。

## Task 1: 建立四方向配置契约

**Files:**
- Create: `wristo-studio/src/elements/goal/goalBar/goalBar.direction.ts`
- Create: `wristo-studio/src/elements/goal/goalBar/goalBar.direction.test.ts`
- Modify: `wristo-studio/src/types/elements/goal.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.schema.ts`

- [ ] **Step 1: 编写失败的方向测试**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeGoalBarDirection, resolveGoalBarDirection } from './goalBar.direction'

describe('goalBar direction', () => {
  it.each([
    ['leftToRight', 'horizontal', false],
    ['rightToLeft', 'horizontal', true],
    ['bottomToTop', 'vertical', true],
    ['topToBottom', 'vertical', false],
  ] as const)('maps %s', (direction, axis, reversed) => {
    expect(resolveGoalBarDirection(direction)).toEqual({ direction, axis, reversed })
  })

  it('migrates legacy values without overriding a valid new value', () => {
    expect(normalizeGoalBarDirection(undefined, 'right')).toBe('rightToLeft')
    expect(normalizeGoalBarDirection(undefined, 'left')).toBe('leftToRight')
    expect(normalizeGoalBarDirection('bottomToTop', 'right')).toBe('bottomToTop')
    expect(normalizeGoalBarDirection('diagonal', 'right')).toBe('leftToRight')
  })
})
```

- [ ] **Step 2: 运行测试确认模块缺失**

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar/goalBar.direction.test.ts`

Expected: FAIL，无法解析 `goalBar.direction`。

- [ ] **Step 3: 实现方向模型**

```ts
export const GOAL_BAR_DIRECTIONS = ['leftToRight', 'rightToLeft', 'bottomToTop', 'topToBottom'] as const
export type GoalBarProgressDirection = typeof GOAL_BAR_DIRECTIONS[number]

export function normalizeGoalBarDirection(value: unknown, legacyAlign?: unknown): GoalBarProgressDirection {
  if (GOAL_BAR_DIRECTIONS.includes(value as GoalBarProgressDirection)) return value as GoalBarProgressDirection
  if (value === undefined || value === null || value === '') return legacyAlign === 'right' ? 'rightToLeft' : 'leftToRight'
  return 'leftToRight'
}

export function resolveGoalBarDirection(direction: GoalBarProgressDirection) {
  return {
    direction,
    axis: direction === 'leftToRight' || direction === 'rightToLeft' ? 'horizontal' as const : 'vertical' as const,
    reversed: direction === 'rightToLeft' || direction === 'bottomToTop',
  }
}
```

在 `GoalBarElementConfig` 中以 `progressDirection: GoalBarProgressDirection` 替换 `progressAlign`，schema 默认值改为 `leftToRight`。

- [ ] **Step 4: 运行测试与阶段性类型检查**

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar/goalBar.direction.test.ts && npx vue-tsc --noEmit`

Expected: 方向测试 PASS；类型检查只允许报告尚未迁移的 GoalBar `progressAlign` 调用点。

- [ ] **Step 5: 提交配置契约**

```bash
cd wristo-studio
git add src/types/elements/goal.ts src/elements/goal/goalBar/goalBar.schema.ts src/elements/goal/goalBar/goalBar.direction.ts src/elements/goal/goalBar/goalBar.direction.test.ts
git commit -m "扩展 GoalBar 四方向配置"
```

## Task 2: 完成 encoder 兼容与设置面板

**Files:**
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.encoder.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.encoder.test.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.panel.vue`
- Create: `wristo-studio/src/elements/goal/goalBar/goalBar.panel.test.ts`
- Modify: `wristo-studio/src/i18n.ts`

- [ ] **Step 1: 增加 encoder 失败测试**

```ts
it.each([
  [{ progressAlign: 'left' }, 'leftToRight'],
  [{ progressAlign: 'right' }, 'rightToLeft'],
  [{ progressDirection: 'bottomToTop', progressAlign: 'right' }, 'bottomToTop'],
  [{ progressDirection: 'topToBottom' }, 'topToBottom'],
] as const)('normalizes %o', (input, expected) => {
  const decoded = decodeGoalBar(createConfig(input as Record<string, unknown>))
  expect((decoded as any).progressDirection).toBe(expected)
  expect((decoded as any).progressAlign).toBeUndefined()
  const encoded = encodeGoalBar(decoded)
  expect(encoded.progressDirection).toBe(expected)
  expect((encoded as any).progressAlign).toBeUndefined()
})
```

- [ ] **Step 2: 运行 encoder 测试确认仍输出旧字段**

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar/goalBar.encoder.test.ts`

Expected: FAIL，结果仍包含 `progressAlign`。

- [ ] **Step 3: 迁移 encoder**

编码时优先 live `progressDirection`，其次 config 新字段，再用 live/config `progressAlign` 兼容；decode 使用同一 `normalizeGoalBarDirection`。编码和解码结果都只写：

```ts
progressDirection: normalizeGoalBarDirection(
  anyElement.progressDirection ?? config.progressDirection,
  anyElement.progressAlign ?? config.progressAlign,
),
```

- [ ] **Step 4: 编写面板失败测试**

```ts
import source from './goalBar.panel.vue?raw'

it('offers and saves all four directions', () => {
  for (const value of ['leftToRight', 'rightToLeft', 'bottomToTop', 'topToBottom']) expect(source).toContain(value)
  expect(source).toContain('applyUpdate({ progressDirection: value })')
  expect(source).not.toContain('setProgressAlign')
})
```

- [ ] **Step 5: 替换面板控件和文案**

使用四项单选控件，更新函数固定为：

```ts
const setProgressDirection = async (value: GoalBarProgressDirection) => {
  currentModel.value.progressDirection = value
  await applyUpdate({ progressDirection: value })
}
```

在 `src/i18n.ts` 增加 `Progress Direction`、`Left to Right`、`Right to Left`、`Bottom to Top`、`Top to Bottom` 及对应中文翻译。

- [ ] **Step 6: 运行测试并提交**

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar/goalBar.encoder.test.ts src/elements/goal/goalBar/goalBar.panel.test.ts`

Expected: 全部 PASS。

```bash
git add src/elements/goal/goalBar/goalBar.encoder.ts src/elements/goal/goalBar/goalBar.encoder.test.ts src/elements/goal/goalBar/goalBar.panel.vue src/elements/goal/goalBar/goalBar.panel.test.ts src/i18n.ts
git commit -m "支持选择 GoalBar 四种进度方向"
```

## Task 3: 实现 Studio 轴向几何和 renderer

**Files:**
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.geometry.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.geometry.test.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.gradient.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.gradient.test.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.renderer.ts`
- Create: `wristo-studio/src/elements/goal/goalBar/goalBar.renderer.direction.test.ts`
- Modify: `wristo-studio/src/elements/goal/goalBar/goalBar.renderer.preview.test.ts`

- [ ] **Step 1: 编写四方向多边形裁剪失败测试**

```ts
const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
it.each([
  ['leftToRight', [0, 0.5, 0, 1]], ['rightToLeft', [0.5, 1, 0, 1]],
  ['topToBottom', [0, 1, 0, 0.5]], ['bottomToTop', [0, 1, 0.5, 1]],
] as const)('clips %s', (direction, bounds) => {
  expect(boundsOf(clipGoalBarPolygon(square, 0.5, direction))).toEqual(bounds)
})
```

- [ ] **Step 2: 运行 geometry 测试确认旧签名失败**

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar/goalBar.geometry.test.ts`

Expected: FAIL，当前只支持 X 轴 `left/right` 裁剪。

- [ ] **Step 3: 将裁剪参数化为 X/Y 主轴**

```ts
export function clipGoalBarPolygon(points: GoalBarPolygonPoint[], progress: number, direction: GoalBarProgressDirection) {
  const { axis, reversed } = resolveGoalBarDirection(direction)
  const boundary = reversed ? 1 - progress : progress
  return clipPolygonAtBoundary(points, boundary, axis, reversed)
}
```

`clipPolygonAtBoundary` 在 horizontal 时插值 Y，在 vertical 时插值 X；保留现有去重点和无效结果降级。

- [ ] **Step 4: 编写并实现四方向渐变测试**

测试固定 `width: 100, height: 40`，断言坐标分别为 `(0,0→100,0)`、`(100,0→0,0)`、`(0,40→0,0)`、`(0,0→0,40)`。将 gradient 输入的 `progressAlign` 替换为 `progressDirection`，colorStops 保持不变。

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar/goalBar.gradient.test.ts`

Expected: 四方向全部 PASS。

- [ ] **Step 5: 编写 renderer 失败测试**

对 `width: 100, height: 40, padding: 0, progress: 0.25` 分别断言：水平进度尺寸为 `25×40`，垂直为 `100×10`；反向方向的 progress 起点位于右侧或底部。分段模式额外断言首段位置，多边形模式断言裁剪边界。

- [ ] **Step 6: 用统一边界函数迁移 renderer**

```ts
function getProgressBounds(width: number, height: number, progress: number, direction: GoalBarProgressDirection) {
  const ratio = Math.max(0, Math.min(1, progress))
  switch (direction) {
    case 'rightToLeft': return { left: width * (1 - ratio), top: 0, width: width * ratio, height }
    case 'topToBottom': return { left: 0, top: 0, width, height: height * ratio }
    case 'bottomToTop': return { left: 0, top: height * (1 - ratio), width, height: height * ratio }
    default: return { left: 0, top: 0, width: width * ratio, height }
  }
}
```

padding 先缩小内容框；分段沿主轴计算尺寸和 gap，并按 `reversed` 反转视觉索引；多边形调用新裁剪函数。renderer live keys、gradient 调用和 preview fixture 全部改用 `progressDirection`。

- [ ] **Step 7: 运行 GoalBar 测试并提交**

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar`

Expected: 目录内全部测试 PASS。

```bash
git add src/elements/goal/goalBar
git commit -m "支持 GoalBar 四方向预览"
```

## Task 4: 贯通 scaffold 和 Jinja 模板

**Files:**
- Modify: `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Create: `wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_direction.py`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_polygon.py`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_gradient.py`
- Modify: `wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`

- [ ] **Step 1: 编写提取器失败测试**

```py
def test_direction_contract(self):
    for direction in ("leftToRight", "rightToLeft", "bottomToTop", "topToBottom"):
        result = self.extract({"eleType": "goalBar", "progressDirection": direction})
        self.assertEqual(result["progressDirection"], direction)
        self.assertEqual(result["progressDirectionLiteral"], json.dumps(direction))
    self.assertEqual(self.extract({"eleType": "goalBar", "progressAlign": "right"})["progressDirection"], "rightToLeft")
    self.assertEqual(self.extract({"eleType": "goalBar", "progressDirection": "diagonal"})["progressDirection"], "leftToRight")
```

- [ ] **Step 2: 运行测试确认新字段缺失**

Run: `cd wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_goal_bar_direction -v`

Expected: FAIL，缺少 `progressDirection`。

- [ ] **Step 3: 实现 Python 归一化**

```py
GOAL_BAR_DIRECTIONS = {"leftToRight", "rightToLeft", "bottomToTop", "topToBottom"}
def normalize_goal_bar_direction(element):
    direction = element.get("progressDirection")
    if direction in GOAL_BAR_DIRECTIONS:
        return direction
    if direction is None:
        return "rightToLeft" if element.get("progressAlign") == "right" else "leftToRight"
    return "leftToRight"
```

GoalBar 分支写入 `progressDirection` 与 `progressDirectionLiteral`，停止输出 `progressAlign`。

- [ ] **Step 4: 更新模板和现有测试夹具**

将 `SuperAlphaView.j2.mc` GoalBar options 中的参数替换为：

```mc
:progressDirection => {{ element.progressDirectionLiteral }},
```

polygon/gradient 测试 fixture 使用 `progressDirectionLiteral`。

- [ ] **Step 5: 运行测试并分别提交两个仓库**

Run: `cd wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_goal_bar_direction tests.test_goal_bar_polygon tests.test_goal_bar_gradient -v`

Expected: 全部 PASS。

```bash
cd wristo-connectiq-app-build
git add wristo-scaffold/super-extract-elements.py wristo-scaffold/tests
git commit -m "导出 GoalBar 四方向配置"
cd ../wristo-apps/SuperAlpha
git add source/SuperAlphaView.j2.mc
git commit -m "传递 GoalBar 四方向参数"
```

## Task 5: 扩展 SuperBarrel Monkey C Runtime

**Files:**
- Modify: `wristo-apps/SuperBarrel/goal/GoalBar.mc`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_direction.py`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_gradient.py`

- [ ] **Step 1: 添加 Runtime 源码契约失败测试**

```py
self.assertIn(':progressDirection as String?', source)
self.assertIn(':progressDirection => "leftToRight"', source)
self.assertIn('direction.equals("bottomToTop")', source)
self.assertIn('direction.equals("topToBottom")', source)
self.assertNotIn(':progressAlign as String?', source)
```

- [ ] **Step 2: 运行测试确认 Runtime 仍使用旧字段**

Run: `cd wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_goal_bar_direction tests.test_goal_bar_gradient -v`

Expected: FAIL，Runtime 缺少新契约。

- [ ] **Step 3: 替换 option 并建立 Runtime helper**

```mc
function isVertical(direction as String) as Boolean {
    return direction.equals("bottomToTop") || direction.equals("topToBottom");
}
function isReversed(direction as String) as Boolean {
    return direction.equals("rightToLeft") || direction.equals("bottomToTop");
}
```

将 `CustomOpt`、`defaultOpt` 和 merge 字段换成 `progressDirection`。

- [ ] **Step 4: 迁移全部绘制分支**

连续模式按轴选择 progressWidth/progressHeight；渐变水平按宽度切片、垂直按高度切片；多边形裁剪增加水平裁剪线；分段沿主轴计算 slice 和 gap，并以 `isReversed` 反转索引与部分段起点。所有分支共用同一个 0..1 progress clamp。

- [ ] **Step 5: 运行 Runtime 契约测试**

Run: `cd wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_goal_bar_direction tests.test_goal_bar_polygon tests.test_goal_bar_gradient -v`

Expected: 全部 PASS，`GoalBar.mc` 不再出现 `progressAlign`。

- [ ] **Step 6: 分别提交 Runtime 与测试**

```bash
cd wristo-apps/SuperBarrel
git add goal/GoalBar.mc
git commit -m "支持 GoalBar 四方向绘制"
cd ../../wristo-connectiq-app-build
git add wristo-scaffold/tests/test_goal_bar_direction.py wristo-scaffold/tests/test_goal_bar_gradient.py
git commit -m "验证 GoalBar 四方向运行时"
```

## Task 6: 端到端回归验证

**Files:**
- Modify only if verification exposes a GoalBar-scoped defect in files listed above.

- [ ] **Step 1: 检查旧字段边界**

Run: `rg -n "progressAlign" wristo-studio/src/elements/goal/goalBar wristo-studio/src/types/elements/goal.ts wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc wristo-apps/SuperBarrel/goal/GoalBar.mc`

Expected: 只在 encoder/提取器兼容输入和对应测试中出现；renderer、模板和 Runtime 无命中。

- [ ] **Step 2: 运行 Studio 测试与构建**

Run: `cd wristo-studio && npx vitest run src/elements/goal/goalBar && npm run build`

Expected: 全部 PASS。若当前未提交 `subDial` 修改引发无关错误，单独记录首个根因，不归因于 GoalBar。

- [ ] **Step 3: 运行 scaffold 测试**

Run: `cd wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_goal_bar_direction tests.test_goal_bar_polygon tests.test_goal_bar_gradient -v`

Expected: 全部 PASS。

- [ ] **Step 4: 尝试 Monkey C 构建**

根据 `wristo-connectiq-app-build/wristo-scaffold/README.md` 或现有构建脚本生成含四方向 GoalBar 的示例并执行 Monkey C 构建。Expected: 构建成功；若 SDK/Java/模拟器环境阻塞，记录完整命令和首个根因错误，只报告 Runtime 源码测试通过，不宣称真机验证通过。

- [ ] **Step 5: 检查四个仓库的 diff**

```bash
git -C wristo-studio diff --check
git -C wristo-connectiq-app-build diff --check
git -C wristo-apps/SuperAlpha diff --check
git -C wristo-apps/SuperBarrel diff --check
```

Expected: 无 whitespace error。

- [ ] **Step 6: 手工 UI 回归**

在 Studio 创建四个 50% GoalBar，逐项切换 continuous/segmented、自定义多边形和 gradient，确认起点、首段、裁剪边界和渐变起始色一致。导入只含 `progressAlign: 'right'` 的旧设计，确认显示为从右到左且重新导出只含 `progressDirection: 'rightToLeft'`。

- [ ] **Step 7: 仅在验证产生修复时提交**

按实际受影响仓库分别提交 GoalBar 范围文件，使用 `修复 GoalBar 四方向回归`；无需修复时不创建空提交。
