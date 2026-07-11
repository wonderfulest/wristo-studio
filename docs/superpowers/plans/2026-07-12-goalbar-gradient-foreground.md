# GoalBar Gradient Foreground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 GoalBar 在 Studio 预览、导出和 Connect IQ 运行时中支持随进度方向变化的双色渐变前景色。

**Architecture:** 复用 GoalArc 的 `gradientEnabled`、`gradientStartColor`、`gradientEndColor` 配置契约。Studio 使用 Fabric 线性渐变预览，脚手架规范化颜色并传递给 Jinja，Monkey C 运行时通过有上限的色片插值绘制连续条、分段条和自定义多边形。

**Tech Stack:** Vue 3、TypeScript、Fabric.js 6、Vitest、Python unittest、Jinja2、Garmin Monkey C。

## Global Constraints

- 左对齐时渐变从左向右，右对齐时渐变从右向左。
- 未启用渐变或颜色无效时保持现有单色行为。
- 只支持双色前景渐变；背景色和边框不增加渐变。
- 保留工作区中已有且与 GoalBar 多边形编辑等功能相关的未提交改动。
- 每次编辑前检查目标文件当前 diff；不得用整文件替换覆盖用户改动。

---

### Task 1: Studio 配置往返与默认值

**Files:**
- Modify: `src/types/elements/goal.ts`
- Modify: `src/elements/goal/goalBar/goalBar.schema.ts`
- Modify: `src/elements/goal/goalBar/goalBar.encoder.ts`
- Test: `src/elements/goal/goalBar/goalBar.encoder.test.ts`

**Interfaces:**
- Consumes: GoalArc 已有的三个渐变字段命名。
- Produces: `GoalBarElementConfig.gradientEnabled?: boolean`、`gradientStartColor?: string`、`gradientEndColor?: string`，供面板、渲染器和导出链路读取。

- [ ] **Step 1: 写入失败测试**

在 `goalBar.encoder.test.ts` 增加一个用例：构造带 `gradientEnabled: true`、`gradientStartColor: '#112233'`、`gradientEndColor: '#AABBCC'` 的配置，验证 `decodeGoalBar` 后再 `encodeGoalBar` 仍保留三个字段；另一个断言验证旧配置解码时使用 `false` 和当前 `color` 作为回退。

- [ ] **Step 2: 验证测试因字段尚未往返而失败**

Run: `npm run test:unit -- src/elements/goal/goalBar/goalBar.encoder.test.ts`

Expected: 新增渐变字段断言失败，既有多边形兼容测试继续通过。

- [ ] **Step 3: 最小化实现配置契约**

给 `GoalBarElementConfig` 和 schema 默认配置增加三个字段。编码时优先读取 live element 字段，再回退到 `__element.config`；解码时把三个字段写回 Fabric 配置，缺失值分别规范化为 `false`、`config.color`、`config.color`。

- [ ] **Step 4: 验证单元测试通过**

Run: `npm run test:unit -- src/elements/goal/goalBar/goalBar.encoder.test.ts`

Expected: PASS。

### Task 2: Studio 面板与画布预览

**Files:**
- Modify: `src/elements/goal/goalBar/goalBar.panel.vue`
- Modify: `src/elements/goal/goalBar/goalBar.renderer.ts`
- Create: `src/elements/goal/goalBar/goalBar.gradient.ts`
- Create: `src/elements/goal/goalBar/goalBar.gradient.test.ts`

**Interfaces:**
- Consumes: Task 1 的三个配置字段，以及 ColorPicker 的 `gradient-change` 事件 `{ enabled, startColor, endColor }`。
- Produces: `createGoalBarGradientFill(bounds, progressAlign, startColor, endColor)`，返回 Fabric `Gradient<'linear'>`；单色模式仍返回原 `color`。

- [ ] **Step 1: 写入渐变方向失败测试**

新增测试验证：同一 bounds 下，左对齐的渐变坐标为 `x1=left, x2=right`，右对齐为 `x1=right, x2=left`；两个 color stop 固定为 offset 0 的起始色和 offset 1 的结束色。

- [ ] **Step 2: 验证方向测试失败**

Run: `npm run test:unit -- src/elements/goal/goalBar/goalBar.gradient.test.ts`

Expected: FAIL，原因是 helper 尚不存在。

- [ ] **Step 3: 实现纯函数并接入 renderer**

在 `goalBar.gradient.ts` 中创建 Fabric 线性渐变 helper。renderer 为连续条、每个分段的 active 区域及自定义多边形 active 区域选择渐变 fill；所有分支共用整体 GoalBar 的左右边界，确保分段颜色在整体进度范围内连续，而不是每段重新从起始色开始。

- [ ] **Step 4: 接入面板**

把前景色 ColorPicker 改为 `enable-gradient`，使用本地 `gradientEnabled`、`gradientStartColor`、`gradientEndColor` 状态；`onGradientChange` 通过现有 `applyUpdate` 一次提交三个字段，保持 live element、store 和导出配置同步。`updateElement` 的 patch 同样包含三个字段。

- [ ] **Step 5: 验证 Studio 测试和类型检查**

Run: `npm run test:unit -- src/elements/goal/goalBar/goalBar.gradient.test.ts src/elements/goal/goalBar/goalBar.encoder.test.ts`

Expected: PASS。

Run: `npm run typecheck`

Expected: exit 0。

### Task 3: 脚手架提取与模板传递

**Files:**
- Modify: `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Create: `wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_gradient.py`
- Modify: `wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`

**Interfaces:**
- Consumes: Studio 导出的三个字段。
- Produces: Jinja element 上的 Monkey C 字面量：`gradientEnabled` 为 `true|false`，颜色为 `0xRRGGBB`；模板将它们传入 `GoalBar.draw`。

- [ ] **Step 1: 写入提取器失败测试**

参照 `test_goal_arc_gradient.py` 动态加载 `super-extract-elements.py`，验证 GoalBar 的有效颜色转换、`transparent`/非法颜色回退到 `color`、缺省禁用；读取模板并断言 GoalBar options 中存在三个渐变键。

- [ ] **Step 2: 验证提取器测试失败**

Run: `python3 -m unittest wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_gradient.py -v`

Expected: FAIL，GoalBar 输出缺少渐变字段或模板键。

- [ ] **Step 3: 复用 GoalArc 颜色规范化逻辑**

把提取器中仅处理 `goalArc` 的渐变分支扩展为同时处理 `goalBar`；保持 `convert_gradient_color_to_hex` 单一来源。模板的 GoalBar options 增加三个字段，并以 `element.color` 作为颜色缺省值。

- [ ] **Step 4: 验证脚手架测试通过**

Run: `python3 -m unittest wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_gradient.py wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_polygon.py -v`

Expected: PASS。

### Task 4: Monkey C 渐变渲染

**Files:**
- Modify: `wristo-apps/SuperBarrel/goal/GoalBar.mc`

**Interfaces:**
- Consumes: `CustomOpt` 中的 `:gradientEnabled`、`:gradientStartColor`、`:gradientEndColor`。
- Produces: `interpolateColor(startColor, endColor, ratio)` 和按 `progressAlign` 计算的颜色比例，供连续、分段、多边形路径统一使用。

- [ ] **Step 1: 添加静态失败检查**

扩展 `test_goal_bar_gradient.py` 读取 `GoalBar.mc`，断言三个 option/default/merge 键存在，且运行时包含颜色插值 helper、最大色片常量以及左右方向比例处理。

- [ ] **Step 2: 验证运行时检查失败**

Run: `python3 -m unittest wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_gradient.py -v`

Expected: FAIL，GoalBar runtime 尚无渐变 option 和 helper。

- [ ] **Step 3: 实现有限分片渲染**

为 `CustomOpt`、`defaultOpt` 和 merge 增加三个字段。增加 RGB 通道插值 helper 和色片预算常量。连续矩形按已完成宽度切片；右对齐反转空间方向但 ratio 仍从进度起点 0 增至终点 1。分段模式以 active 进度序号计算全局 ratio；多边形模式在已裁剪 active polygon 内继续按 X 区间切片并填充。若渐变禁用或颜色为透明哨兵值，则调用现有单色路径。

- [ ] **Step 4: 验证脚手架和模板检查通过**

Run: `python3 -m unittest discover -s wristo-connectiq-app-build/wristo-scaffold/tests -p 'test_goal_*gradient.py' -v`

Expected: PASS。

### Task 5: 全量验证与变更审计

**Files:**
- Verify only: all files above

**Interfaces:**
- Consumes: Tasks 1-4 的完整链路。
- Produces: 可交付的构建和测试证据。

- [ ] **Step 1: 运行 Studio 单元测试和构建**

Run: `npm run test:unit`

Expected: exit 0。

Run: `npm run build`

Expected: exit 0。

- [ ] **Step 2: 运行 GoalBar/GoalArc 脚手架回归测试**

Run: `python3 -m unittest wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_gradient.py wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_bar_polygon.py wristo-connectiq-app-build/wristo-scaffold/tests/test_goal_arc_gradient.py -v`

Expected: PASS。

- [ ] **Step 3: 审计 diff**

Run: `git -C wristo-studio diff --check && git -C wristo-apps diff --check && git -C wristo-connectiq-app-build diff --check`

Expected: 无空白错误。逐文件确认已有 GoalBar 多边形编辑和 ColorPicker 改动仍保留，且没有无关文件被修改。

- [ ] **Step 4: 报告手工验证项**

在 Studio 中分别检查连续、分段、自定义多边形的 50% 进度：左对齐应从左侧起始色向右过渡，右对齐应从右侧起始色向左过渡；关闭渐变后应恢复 `color` 单色。
