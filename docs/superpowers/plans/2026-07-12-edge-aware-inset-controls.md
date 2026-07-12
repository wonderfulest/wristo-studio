# Ticks Edge-Aware Inset Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让铺满画布的 `tick12`、`tick60` 和 `romans` 的四角缩放控制点固定内缩 12px，避免被画布边界或圆形裁剪区域遮挡。

**Architecture:** 在共享 `controlManager` 中增加 `corner4Inset` 控制模式，它只改变四个缩放控制点的屏幕像素偏移，复用现有等比缩放和图层顺序控制。共享 dial renderer 在创建、配置和图片替换时统一选择该模式，现有 `scaleFactor`、中心锁定和编码链路保持不变。

**Tech Stack:** Vue 3、TypeScript、Fabric.js、Vitest、Vite

---

## 文件结构

- 修改 `src/utils/controlManager.test.ts`：锁定 `corner4Inset` 与普通 `corner4` 的控制点偏移契约。
- 修改 `src/utils/controlManager.ts`：新增模式、12px 常量及四角偏移。
- 修改 `src/elements/dials/common/dial.renderer.ts`：让共享 ticks renderer 始终声明新模式。

### Task 1: 为内缩控制模式建立测试契约

**Files:**
- Test: `src/utils/controlManager.test.ts`
- Modify: `src/utils/controlManager.ts`

- [ ] **Step 1: 写出失败测试**

在测试导入中加入 `applyControlsToObject` 和 `INSET_CORNER_CONTROL_OFFSET`，并新增：

```ts
describe('applyControlsToObject', () => {
  function createTarget(mode: string) {
    return {
      designerControlMode: mode,
      selectable: true,
      evented: true,
      hasControls: true,
      set(props: Record<string, unknown>) {
        Object.assign(this, props)
      },
    }
  }

  it('insets all four corner controls for edge-sized elements', () => {
    const target = createTarget('corner4Inset') as any

    applyControlsToObject(target)

    expect(INSET_CORNER_CONTROL_OFFSET).toBe(12)
    expect(target.controls.tl).toMatchObject({ offsetX: 12, offsetY: 12 })
    expect(target.controls.tr).toMatchObject({ offsetX: -12, offsetY: 12 })
    expect(target.controls.bl).toMatchObject({ offsetX: 12, offsetY: -12 })
    expect(target.controls.br).toMatchObject({ offsetX: -12, offsetY: -12 })
  })

  it('keeps regular corner controls on the object bounds', () => {
    const target = createTarget('corner4') as any

    applyControlsToObject(target)

    expect(target.controls.tl).toMatchObject({ offsetX: 0, offsetY: 0 })
    expect(target.controls.br).toMatchObject({ offsetX: 0, offsetY: 0 })
  })
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: FAIL，提示 `INSET_CORNER_CONTROL_OFFSET` 未导出或 `corner4Inset` 控制点偏移不符合预期。

- [ ] **Step 3: 实现最小共享控制模式**

在 `src/utils/controlManager.ts` 中增加：

```ts
export const INSET_CORNER_CONTROL_OFFSET = 12

type ControlSetMode = 'default' | 'resize8' | 'corner4' | 'corner4Inset'
```

让 `createControls` 根据模式生成偏移，并保持普通模式为零偏移：

```ts
const inset = mode === 'corner4Inset' ? INSET_CORNER_CONTROL_OFFSET : 0

// tl
offsetX: inset,
offsetY: inset,

// tr
offsetX: -inset,
offsetY: inset,

// bl
offsetX: inset,
offsetY: -inset,

// br
offsetX: -inset,
offsetY: -inset,
```

将仅返回四角和图层顺序控制点的判断扩展为：

```ts
if (mode === 'corner4' || mode === 'corner4Inset') {
  return { ...cornerControls, ...layerOrderControls }
}
```

在 `applyControlsToObject` 中识别新模式：

```ts
const mode =
  (t as any).designerControlMode === 'resize8'
    ? 'resize8'
    : (t as any).designerControlMode === 'corner4Inset'
      ? 'corner4Inset'
      : (t as any).designerControlMode === 'corner4'
        ? 'corner4'
        : 'default'
```

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: PASS，新增和原有测试全部通过。

- [ ] **Step 5: 提交共享控制模式**

```bash
git add src/utils/controlManager.ts src/utils/controlManager.test.ts
git commit -m "支持边缘内缩控制点"
```

### Task 2: 让共享 ticks renderer 使用内缩模式

**Files:**
- Modify: `src/elements/dials/common/dial.renderer.ts`

- [ ] **Step 1: 写出失败的静态契约测试**

在 `src/utils/controlManager.test.ts` 新增一个针对共享 renderer 源码的契约测试，确保创建、配置和图片替换路径不会退回 `corner4`：

```ts
import dialRendererSource from '@/elements/dials/common/dial.renderer.ts?raw'

it('uses inset corner controls throughout the shared dial renderer', () => {
  expect(dialRendererSource).not.toContain("designerControlMode: 'corner4',")
  expect(dialRendererSource.match(/designerControlMode: 'corner4Inset'/g)).toHaveLength(3)
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: FAIL，因为共享 renderer 当前仍包含三个 `designerControlMode: 'corner4'`。

- [ ] **Step 3: 修改共享 dial renderer**

把 `configureDialControls`、`createDial` 和图片替换分支中的三处声明统一改为：

```ts
designerControlMode: 'corner4Inset',
```

- [ ] **Step 4: 运行相关测试并确认 GREEN**

Run: `npm run test:unit -- src/utils/controlManager.test.ts`

Expected: PASS，所有控制点契约测试通过。

- [ ] **Step 5: 提交 ticks 接入**

```bash
git add src/elements/dials/common/dial.renderer.ts src/utils/controlManager.test.ts
git commit -m "为 ticks 内缩缩放控制点"
```

### Task 3: 完整验证

**Files:**
- Verify: `src/utils/controlManager.ts`
- Verify: `src/utils/controlManager.test.ts`
- Verify: `src/elements/dials/common/dial.renderer.ts`

- [ ] **Step 1: 运行完整单元测试**

Run: `npm run test:unit`

Expected: PASS，无失败测试。

- [ ] **Step 2: 运行生产构建**

Run: `npm run build`

Expected: exit code 0，TypeScript 检查与 Vite 构建成功。

- [ ] **Step 3: 检查差异质量和范围**

Run: `git diff --check HEAD~2..HEAD && git status --short`

Expected: `git diff --check` 无输出；状态中仅保留实施前已有的 `package.json`、`package-lock.json` 和 `.nvmrc` 用户改动。

- [ ] **Step 4: 手动验收说明**

在 Studio 中依次选择 `tick12`、`tick60`、`romans`，确认四角控制点完整位于画布内部，拖动任一控制点仍以表盘中心等比缩放，并在保存、重新加载后保持比例。
