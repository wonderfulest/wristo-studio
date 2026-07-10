# Actions Menu Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Actions to the usable design/package commands while retaining View.

**Architecture:** Simplify the existing `AppMenuActions` presentation component and remove now-unused handler wiring from `AppMenu`; leave `.wrt` file input/event wiring unchanged.

**Tech Stack:** Vue 3, TypeScript, Element Plus, Vite.

---

### Task 1: Remove redundant Actions entries

**Files:**
- Modify: `src/components/layout/app-menu/AppMenuActions.vue`
- Modify: `src/components/layout/AppMenu.vue`

- [ ] **Step 1: Remove obsolete menu items and props**

Keep `View`, `Screenshot`, `Record GIF`, `Export .wrt`, `Import .wrt`, and `App Properties`. Delete Build, menu Save, and Export asset package markup, their props, forwarder functions, icon imports only used by them, and the separator that no longer groups anything.

```vue
<el-menu-item index="actions/exportWrt" @click="onExportWrt">
  <el-icon><Download /></el-icon>
  <span>{{ t('editor.exportWrt') }}</span>
</el-menu-item>
```

- [ ] **Step 2: Remove obsolete AppMenu wiring**

Delete `:on-build`, `:on-save`, and `:on-export-asset-package` from `<AppMenuActions>`, then delete `handleBuild` and `handleExportAssetPackage`. Retain the top-level Save button, `handleSave`, View routing, screenshot/GIF handlers, and the hidden `.wrt` input.

- [ ] **Step 3: Verify production build**

Run: `npm run build && git diff --check`

Expected: exit code `0`; no unused import/type error and no whitespace errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-menu/AppMenuActions.vue src/components/layout/AppMenu.vue
git commit -m "refactor: simplify studio actions menu"
```
