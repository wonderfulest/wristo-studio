# Pasted Elements Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 粘贴一组复制元素后，用本次成功创建的新元素替换当前选区。

**Architecture:** `pasteSelection()` 继续负责粘贴事务，并收集 `addElement()` 返回的 Fabric 对象。一个小型纯选区提交函数根据成功对象数量设置单选或 `ActiveSelection`，统一刷新画布；现有 Fabric 选择事件负责同步应用选中状态。

**Tech Stack:** TypeScript、Vue 3、Fabric.js 6、Vitest、Pinia。

## Global Constraints

- 取消原元素选区，只选中本次成功粘贴产生的元素。
- 保持现有复制数据、30 像素递增偏移和单次 `paste:selection` 历史记录语义。
- 部分失败时只选择成功创建的对象；全部失败时不创建空选区。
- 改动限定在 `wristo-studio`。

---

### Task 1: 粘贴完成后提交新元素选区

**Files:**
- Create: `src/engine/managers/clipboardManager.test.ts`
- Modify: `src/engine/managers/clipboardManager.ts`

**Interfaces:**
- Consumes: `addElement(type, config): Promise<FabricElement | null | undefined>` 和 Fabric `Canvas.setActiveObject()`。
- Produces: `commitPastedSelection(canvas, pastedObjects): void`，供 `pasteSelection()` 在创建事务结束后调用。

- [ ] **Step 1: 写入失败测试**

在 `clipboardManager.test.ts` 中对 `commitPastedSelection` 写三个测试：多个对象构造 `ActiveSelection` 并替换旧选区；单个对象直接成为活动对象；空数组仅清除旧选区而不创建活动对象。测试画布替身记录 `discardActiveObject`、`setActiveObject` 和 `requestRenderAll` 调用，并断言多选对象包含全部成功对象且 `hasControls` 为 `false`。

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `npm run test:unit -- src/engine/managers/clipboardManager.test.ts`

Expected: FAIL，因为 `commitPastedSelection` 尚未导出或实现。

- [ ] **Step 3: 写最小实现**

在 `clipboardManager.ts` 中：

```ts
import { ActiveSelection } from 'fabric'

export function commitPastedSelection(canvas: any, pastedObjects: FabricElement[]): void {
  canvas.discardActiveObject?.()
  if (pastedObjects.length === 1) {
    canvas.setActiveObject?.(pastedObjects[0])
  } else if (pastedObjects.length > 1) {
    const selection = new ActiveSelection(pastedObjects as any[], { canvas })
    selection.set({ hasControls: false })
    selection.setCoords?.()
    canvas.setActiveObject?.(selection)
  }
  canvas.requestRenderAll?.()
}
```

在 `pasteSelection()` 启动异步事务后取得 `useCanvasStore().canvas`，建立 `pastedObjects`；仅将 `addElement()` 返回的非空对象加入数组。`runWithoutRecording()` 完成后调用 `commitPastedSelection(canvas, pastedObjects)`，随后保持一次 `historyStore.saveState('paste:selection')`。

- [ ] **Step 4: 运行目标测试并确认通过**

Run: `npm run test:unit -- src/engine/managers/clipboardManager.test.ts`

Expected: PASS，三个选区场景全部通过。

- [ ] **Step 5: 运行回归验证**

Run: `npm run test:unit`

Expected: 全部 Vitest 测试通过。

Run: `npm run typecheck`

Expected: `vue-tsc --noEmit` 退出码为 0。

Run: `npm run build`

Expected: 生产构建成功。

- [ ] **Step 6: 提交实现**

```bash
git add src/engine/managers/clipboardManager.ts src/engine/managers/clipboardManager.test.ts docs/superpowers/plans/2026-07-12-pasted-elements-selection.md
git commit -m "keep pasted elements selected"
```
