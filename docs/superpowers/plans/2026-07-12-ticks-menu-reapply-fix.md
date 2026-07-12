# Ticks Menu Reapply Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 防止 Canvas 生命周期中的通用图层菜单重应用覆盖 ticks 的安全操作入口。

**Architecture:** `applyLayerOrderControlsToObject` 从目标对象读取 `designerControlMode`，并把该模式传给现有 `createLayerOrderControls`。这样首次控制点创建和 Canvas 后续重应用使用同一定位策略，不修改 Canvas Manager 调用顺序。

**Tech Stack:** TypeScript、Fabric.js、Vitest、Vue 3、Vite

---

## 文件结构

- 修改 `src/utils/controlManager.test.ts`：模拟真实的两阶段重应用顺序。
- 修改 `src/utils/controlManager.ts`：让图层菜单重应用保留 `corner4Inset` 模式。

### Task 1: 修复模式丢失

**Files:**
- Modify: `src/utils/controlManager.ts`
- Test: `src/utils/controlManager.test.ts`

- [ ] **Step 1: 写出失败回归测试**

在 `applyControlsToObject` 测试组增加：

```ts
it('preserves the ticks safe action menu after generic layer controls are reapplied', () => {
  const target = createTarget('corner4Inset') as any
  target.canvas = { getWidth: () => 600, getHeight: () => 600 }

  applyControlsToObject(target)
  applyLayerOrderControlsToObject(target)

  expect(getControlPosition(target, 'layerOrderControl', new Point(800, 800)))
    .toMatchObject({ x: 570, y: 540 })
  expect(getControlPosition(target, 'sendToBackControl', new Point(800, 800)))
    .toMatchObject({ x: 498, y: 508 })
})
```

该测试准确模拟 `canvasManager.ts` 的真实顺序：先应用元素控制点，再通用重应用图层菜单。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: FAIL；重应用后的入口回到 `(710, 710)`，菜单项回到 `(782, 678)`。

- [ ] **Step 3: 实现模式感知重应用**

在 `applyLayerOrderControlsToObject` 中读取目标模式：

```ts
const mode: ControlSetMode =
  (target as unknown as FabricLikeObject).designerControlMode === 'corner4Inset'
    ? 'corner4Inset'
    : 'default'
```

把最终菜单创建从：

```ts
...createLayerOrderControls(),
```

改为：

```ts
...createLayerOrderControls(mode),
```

完整函数保持现有自定义 controls 保留逻辑：

```ts
export function applyLayerOrderControlsToObject(target: FabricObject | null | undefined): void {
  if (!target) return
  const existingControls = (target as unknown as { controls?: Record<string, Control> }).controls ?? {}
  const {
    cloneControl: _legacyCloneControl,
    deleteControl: _legacyDeleteControl,
    ...currentControls
  } = existingControls
  const mode: ControlSetMode =
    (target as unknown as FabricLikeObject).designerControlMode === 'corner4Inset'
      ? 'corner4Inset'
      : 'default'
  ;(target as unknown as { controls: Record<string, Control> }).controls = {
    ...currentControls,
    ...createLayerOrderControls(mode),
  }
}
```

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: PASS；真实重应用顺序后 ticks 入口仍为 `(570, 540)`。

- [ ] **Step 5: 提交修复**

```bash
git add src/utils/controlManager.ts src/utils/controlManager.test.ts
git commit -m "保留 ticks 安全菜单模式"
```

### Task 2: 完整验证

**Files:**
- Verify: `src/utils/controlManager.ts`
- Verify: `src/utils/controlManager.test.ts`

- [ ] **Step 1: 运行完整单元测试**

Run: `npm run test:unit`

Expected: 31 个测试文件全部通过，无失败测试。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: exit code 0，TypeScript 检查与 Vite 构建成功。

- [ ] **Step 3: 检查差异**

Run: `git diff --check && git status --short`

Expected: `git diff --check` 无输出；仅包含控制管理器和测试改动，以及主工作区已有的 package 文件与 `.nvmrc` 改动。

- [ ] **Step 4: 手动验收**

刷新 Studio 并选择放大到超出画布的 `tick12`、`tick60`、`romans`：

```text
1. ••• 入口显示在右下缩放点上方。
2. 入口在首次创建、更新元素、恢复历史后均保持可见。
3. 展开菜单向左上显示，全部按钮可点击。
```
