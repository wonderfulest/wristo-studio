# 多选排列工具条美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将右侧多选排列入口改成标题在上、六个等宽分段按钮在下的全宽工具条。

**Architecture:** 保持 `GroupSettings.vue` 现有数据和事件逻辑不变，仅通过专用表单项类名与 scoped CSS 重塑布局。现有静态回归测试增加视觉结构断言，防止后续退回拥挤的固定宽度圆按钮。

**Tech Stack:** Vue 3、TypeScript、Element Plus、Iconify、Vitest、Vite

---

### Task 1: 固定工具条视觉结构

**Files:**
- Modify: `src/components/panels/settings/groupAlignment.test.ts`

- [ ] **Step 1: 增加失败测试**

在右侧入口测试中加入：

```ts
expect(groupSettingsSource).toContain('class="group-alignment-item"')
expect(groupSettingsSource).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))')
expect(groupSettingsSource).toContain('.group-alignment-button:nth-child(4)')
expect(groupSettingsSource).toContain(':focus-visible')
expect(groupSettingsSource).not.toContain('grid-template-columns: repeat(6, 28px)')
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:unit -- src/components/panels/settings/groupAlignment.test.ts`

Expected: FAIL，当前表单项没有专用类名，按钮仍使用固定 28px 网格。

### Task 2: 实现全宽分段工具条

**Files:**
- Modify: `src/components/panels/settings/GroupSettings.vue`
- Test: `src/components/panels/settings/groupAlignment.test.ts`

- [ ] **Step 1: 标记专用表单项**

```vue
<el-form-item class="group-alignment-item" :label="t('editor.align')">
```

- [ ] **Step 2: 替换工具条局部样式**

```css
.group-alignment-item {
  display: block;
}

.group-alignment-item :deep(.el-form-item__label) {
  width: auto !important;
  height: auto;
  margin: 0 0 8px;
  padding: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
}

.group-alignment-item :deep(.el-form-item__content) {
  width: 100%;
  margin-left: 0 !important;
  line-height: normal;
}

.group-alignment-actions {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--studio-border);
  border-radius: 7px;
  background: var(--studio-surface-subtle, var(--studio-surface));
}

.group-alignment-button {
  width: 100%;
  height: 34px;
  min-height: 34px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--studio-text-muted);
}

.group-alignment-button + .group-alignment-button {
  border-left: 1px solid var(--studio-border);
}

.group-alignment-button:nth-child(4) {
  border-left-color: var(--studio-border-strong);
}

.group-alignment-button:hover,
.group-alignment-button:focus-visible {
  position: relative;
  z-index: 1;
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  box-shadow: inset 0 0 0 1px var(--studio-primary-border);
  outline: none;
}
```

- [ ] **Step 3: 运行定向测试**

Run: `npm run test:unit -- src/components/panels/settings/groupAlignment.test.ts`

Expected: PASS，2 个测试全部通过。

- [ ] **Step 4: 运行全量验证**

Run: `npm run test:unit && npm run build && git diff --check`

Expected: 现有单测与 production build 成功，且无空白错误。

- [ ] **Step 5: 提交实现**

```bash
git add src/components/panels/settings/GroupSettings.vue \
  src/components/panels/settings/groupAlignment.test.ts \
  docs/superpowers/plans/2026-07-12-multiselect-alignment-toolbar-polish.md
git commit -m "美化多选排列工具条"
```
