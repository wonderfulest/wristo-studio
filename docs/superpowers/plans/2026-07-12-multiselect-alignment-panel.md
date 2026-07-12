# 多选排列方式迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Studio 多选时的 6 个排列按钮从底部编辑栏迁移到右侧多选设置区。

**Architecture:** 排列算法继续由 `alignManager.alignSelection()` 统一负责。右侧 `GroupSettings` 只新增操作入口，底部 `EditorSettingsDialog` 删除对应入口和派生状态，不改变选区、画布或历史记录模型。

**Tech Stack:** Vue 3、TypeScript、Element Plus、Iconify、Fabric.js、Vitest、Vite

---

## 文件结构

- 修改 `src/components/panels/settings/GroupSettings.vue`：渲染右侧 6 个排列操作，并将点击事件转发给现有排列管理器。
- 修改 `src/components/dialogs/EditorSettingsDialog.vue`：移除底部多选排列按钮及其专用状态、事件、导入和样式。
- 新建 `src/components/panels/settings/groupAlignment.test.ts`：静态验证右侧具备 6 个入口且底部入口已删除，防止入口再次漂移。

### Task 1: 用测试固定排列入口位置和数量

**Files:**
- Create: `src/components/panels/settings/groupAlignment.test.ts`

- [ ] **Step 1: 编写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const groupSettingsSource = readFileSync(
  new URL('./GroupSettings.vue', import.meta.url),
  'utf8',
)
const bottomBarSource = readFileSync(
  new URL('../../dialogs/EditorSettingsDialog.vue', import.meta.url),
  'utf8',
)

describe('multi-selection alignment placement', () => {
  it('renders exactly six alignment actions in GroupSettings', () => {
    expect(groupSettingsSource).toContain('class="group-alignment-actions"')
    expect(groupSettingsSource).toContain('v-for="option in groupAlignOptions"')
    expect(groupSettingsSource).toContain('@click="handleGroupAlign(option.type)"')
    expect(groupSettingsSource.match(/labelKey: 'editor\.align/g)).toHaveLength(6)
  })

  it('does not render alignment actions in the bottom editor bar', () => {
    expect(bottomBarSource).not.toContain('quick-align-cell')
    expect(bottomBarSource).not.toContain('quickAlignOptions')
    expect(bottomBarSource).not.toContain('handleQuickAlign')
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:unit -- src/components/panels/settings/groupAlignment.test.ts`

Expected: FAIL，右侧尚无 `group-alignment-actions`，底部仍包含 `quick-align-cell`。

### Task 2: 将 6 个排列操作迁移到右侧

**Files:**
- Modify: `src/components/panels/settings/GroupSettings.vue`
- Modify: `src/components/dialogs/EditorSettingsDialog.vue`
- Test: `src/components/panels/settings/groupAlignment.test.ts`

- [ ] **Step 1: 在右侧多选设置区增加独立排列表单项**

在 `GroupSettings.vue` 的 `<el-form>` 顶部加入：

```vue
<el-form-item :label="t('editor.align')">
  <div class="group-alignment-actions">
    <el-button
      v-for="option in groupAlignOptions"
      :key="option.type"
      circle
      class="group-alignment-button"
      :title="t(option.labelKey)"
      @click="handleGroupAlign(option.type)"
    >
      <Icon :icon="option.icon" width="17" height="17" />
    </el-button>
  </div>
</el-form-item>
```

在脚本中导入 `Icon` 与 `AlignType`，并定义完整的 6 个选项及处理器：

```ts
import { Icon } from '@iconify/vue'
import { alignSelection, type AlignType } from '@/engine/managers/alignManager'

const groupAlignOptions: Array<{ type: AlignType; icon: string; labelKey: string }> = [
  { type: 'left', icon: 'mdi:align-horizontal-left', labelKey: 'editor.alignLeft' },
  { type: 'center', icon: 'mdi:align-horizontal-center', labelKey: 'editor.alignCenter' },
  { type: 'right', icon: 'mdi:align-horizontal-right', labelKey: 'editor.alignRight' },
  { type: 'top', icon: 'mdi:align-vertical-top', labelKey: 'editor.alignTop' },
  { type: 'middle', icon: 'mdi:align-vertical-center', labelKey: 'editor.alignMiddle' },
  { type: 'bottom', icon: 'mdi:align-vertical-bottom', labelKey: 'editor.alignBottom' },
]

const handleGroupAlign = (type: AlignType) => {
  if (props.elements.length <= 1) return
  alignSelection(type)
}
```

增加紧凑的右侧按钮布局：

```css
.group-alignment-actions {
  display: grid;
  grid-template-columns: repeat(6, 28px);
  gap: 4px;
}

.group-alignment-button {
  width: 28px;
  height: 28px;
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 2: 删除底部编辑栏的排列入口**

从 `EditorSettingsDialog.vue` 删除 `quick-align-cell` 模板块、`AlignType`/`alignSelection` 导入、`quickAlignOptions`、`canQuickAlign`、`handleQuickAlign`、`.quick-align-cell` 和 `.quick-align-button`。保留底部时间模拟器、中文内容、网格和画布设置。

- [ ] **Step 3: 运行定向测试**

Run: `npm run test:unit -- src/components/panels/settings/groupAlignment.test.ts`

Expected: PASS，2 个测试全部通过。

- [ ] **Step 4: 运行完整构建**

Run: `npm run build`

Expected: `vue-tsc --noEmit` 与 Vite production build 均成功。

- [ ] **Step 5: 检查改动范围**

Run: `git diff --check && git status --short`

Expected: 无空白错误；仅出现计划内源码、测试和计划文档，以及用户原有的未跟踪文件。

- [ ] **Step 6: 提交实现**

```bash
git add src/components/panels/settings/GroupSettings.vue \
  src/components/dialogs/EditorSettingsDialog.vue \
  src/components/panels/settings/groupAlignment.test.ts \
  docs/superpowers/plans/2026-07-12-multiselect-alignment-panel.md
git commit -m "迁移多选排列入口到右侧"
```
