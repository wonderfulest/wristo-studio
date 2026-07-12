# GoalBar Shortcut Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让菜单栏快捷添加的 GoalBar、左端图标和右端数值共享同一垂直中心，并让数值从进度条右端向右展开。

**Architecture:** 只修改快捷组合 draft 的源头布局，不触碰 GoalBar 渲染器、导出配置或智能摆放算法。通过现有 compound shortcut 单元测试验证三个成员的绝对坐标与水平锚点，确保后续整体平移仍保持相对布局。

**Tech Stack:** TypeScript、Vitest、Vue 3/Vite

---

## File Structure

- Modify: `src/engine/managers/shortcutCompoundDrafts.ts` — 生成 GoalBar 快捷组合三个成员的默认坐标与锚点。
- Modify: `src/engine/managers/compoundShortcutOrchestrator.test.ts` — 锁定 GoalBar 快捷组合的成员类型、坐标及水平锚点。

### Task 1: 对齐 GoalBar 快捷组合

**Files:**
- Modify: `src/engine/managers/shortcutCompoundDrafts.ts:7-17`
- Test: `src/engine/managers/compoundShortcutOrchestrator.test.ts:79-103`

- [ ] **Step 1: 修改现有测试，描述已确认的布局契约**

将坐标断言替换为：

```ts
expect(result?.map((member) => [
  member.config.left,
  member.config.top,
  member.config.originX,
])).toEqual([
  [227, 260, undefined],
  [177, 260, 'center'],
  [277, 260, 'left'],
])
```

该断言验证 GoalBar 使用组合中心、Icon 中心落在左端点、数值左边缘落在右端点，三者纵坐标均为 `260`。

- [ ] **Step 2: 运行目标测试并确认红灯**

Run: `npm run test:unit -- src/engine/managers/compoundShortcutOrchestrator.test.ts`

Expected: FAIL；GoalBar 坐标仍未定义，Icon/数值纵坐标仍为 `240`，且 Icon 的 `originX` 仍为 `right`。

- [ ] **Step 3: 实现最小布局修复**

将 `buildGoalBarDrafts` 的返回值修改为：

```ts
return [
  factory('goal', 'goalBar', { ...shared, left: input.left, top: input.top }, 'goal-bar'),
  factory('metric', 'icon', { ...shared, left: input.left - half, top: input.top, originX: 'center', fontSize: 24, iconSize: 24 }, 'goal-bar-icon'),
  factory('metric', 'data', { ...shared, left: input.left + half, top: input.top, originX: 'left', fontSize: 24 }, 'goal-bar-value'),
]
```

不添加额外间距参数，也不修改字体、图标大小或绑定字段。

- [ ] **Step 4: 运行目标测试并确认绿灯**

Run: `npm run test:unit -- src/engine/managers/compoundShortcutOrchestrator.test.ts`

Expected: PASS，测试文件 12 项全部通过。

- [ ] **Step 5: 运行快捷布局回归测试**

Run: `npm run test:unit -- src/engine/managers/compoundShortcutOrchestrator.test.ts src/engine/managers/shortcutPlacementManager.test.ts`

Expected: PASS，两个测试文件共 43 项全部通过。

- [ ] **Step 6: 运行生产构建**

Run: `npm run build`

Expected: `vue-tsc --noEmit` 与 `vite build --mode prod` 均成功，退出码为 0；现有 Sass 旧 API和大 chunk 提示不视为失败。

- [ ] **Step 7: 检查范围并提交实现**

Run:

```bash
git diff --check -- src/engine/managers/shortcutCompoundDrafts.ts src/engine/managers/compoundShortcutOrchestrator.test.ts
git diff -- src/engine/managers/shortcutCompoundDrafts.ts src/engine/managers/compoundShortcutOrchestrator.test.ts
```

Expected: 无空白错误；GoalBar 相关 diff 仅包含本计划中的坐标、锚点与测试断言变更。保留这两个文件中上一项任务已有的 GoalArc 坐标修复，不覆盖或回退它。

Commit:

```bash
git add src/engine/managers/shortcutCompoundDrafts.ts src/engine/managers/compoundShortcutOrchestrator.test.ts
git commit -m "fix: align goal shortcut elements"
```
