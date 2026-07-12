# Layer Group Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Studio 左侧图层面板中把同一数据分组默认折叠为一条摘要行，并支持展开、整组选择和整组拖拽。

**Architecture:** 新建纯 TypeScript 分组模型，把按“顶部到下方”排列的真实图层转换为 `layer` 或 `group` 面板项；每个分组始终是外层 draggable 的一个节点，展开时只在节点内部渲染成员，因此任何成员拖拽手柄都会移动整个组。`LayerPanel.vue` 只持有会话级展开键集合，并在提交顺序时把虚拟分组还原成真实 ID，再沿用现有 Fabric/`orderIds` 顺序转换。

**Tech Stack:** Vue 3 Composition API、TypeScript、vuedraggable、Fabric 6、Pinia、Vitest。

---

## File map

- Create: `src/components/panels/layerPanelGrouping.ts` — 分组键解析、面板项构建、虚拟项展开为真实图层 ID、失效展开键清理。
- Create: `src/components/panels/layerPanelGrouping.test.ts` — 分组纯逻辑和拖拽顺序回归测试。
- Modify: `src/components/panels/LayerPanel.vue` — 摘要/成员渲染、会话展开状态、整组选择、画布选择触发自动展开、整组拖拽。
- Modify: `src/components/panels/layerPanelOrder.test.ts` — 保留并联合验证“面板顶部为最上层”的顺序协议。

### Task 1: Build the pure layer-group model

**Files:**
- Create: `src/components/panels/layerPanelGrouping.ts`
- Create: `src/components/panels/layerPanelGrouping.test.ts`

- [ ] **Step 1: Write failing tests for default collapse, expansion, singleton behavior, and ID expansion**

```ts
import { describe, expect, it } from 'vitest'
import {
  buildLayerPanelItems,
  expandPanelItemsToLayerIds,
  getLayerGroupKey,
  retainExistingExpandedGroups,
} from './layerPanelGrouping'

const layer = (id: string, group = '') => ({
  id,
  eleType: 'data',
  visible: true,
  displayStates: { active: true, ambient: true },
  locked: false,
  selectable: true,
  element: { id, eleType: 'data', dataProperty: group },
})

describe('layerPanelGrouping', () => {
  it('collapses two matching layers into one group item by default', () => {
    const items = buildLayerPanelItems([layer('steps-label', 'Steps'), layer('steps-value', 'Steps')])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'group', key: 'Steps', label: 'Steps' })
    expect(items[0].kind === 'group' && items[0].members.map((item) => item.id)).toEqual([
      'steps-label',
      'steps-value',
    ])
  })

  it('keeps ungrouped and singleton layers as normal items', () => {
    const items = buildLayerPanelItems([layer('time'), layer('steps', 'Steps')])
    expect(items.map((item) => item.kind)).toEqual(['layer', 'layer'])
  })

  it('expands virtual groups into real IDs without duplicates', () => {
    const items = buildLayerPanelItems([
      layer('time'),
      layer('steps-label', 'Steps'),
      layer('steps-value', 'Steps'),
    ])
    expect(expandPanelItemsToLayerIds(items)).toEqual(['time', 'steps-label', 'steps-value'])
  })

  it('drops expansion keys for groups that no longer exist', () => {
    const items = buildLayerPanelItems([layer('time'), layer('steps', 'Steps')])
    expect([...retainExistingExpandedGroups(new Set(['Steps']), items)]).toEqual([])
  })

  it('uses the existing group-key precedence', () => {
    expect(getLayerGroupKey({ element: { groupId: 'group', dataProperty: 'Steps' } } as any)).toBe('group')
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts`

Expected: FAIL because `./layerPanelGrouping` does not exist.

- [ ] **Step 3: Implement the minimal pure model**

```ts
import type { LayerElement } from '@/types/layer'

export type LayerPanelItem =
  | { kind: 'layer'; id: string; layer: LayerElement }
  | { kind: 'group'; id: string; key: string; label: string; members: LayerElement[] }

const readGroupKey = (value: unknown): string => value == null ? '' : String(value).trim()

export const getLayerGroupKey = (layer: LayerElement | any): string => {
  const object = layer?.element ?? layer
  return readGroupKey(
    object?.groupId ??
    object?.groupKey ??
    object?.groupName ??
    object?.parentId ??
    object?.dataProperty ??
    object?.goalProperty ??
    '',
  )
}

export const buildLayerPanelItems = (layers: LayerElement[]): LayerPanelItem[] => {
  const membersByKey = new Map<string, LayerElement[]>()
  layers.forEach((layer) => {
    const key = getLayerGroupKey(layer)
    if (!key || layer.eleType === 'global' || layer.eleType === 'background') return
    membersByKey.set(key, [...(membersByKey.get(key) ?? []), layer])
  })

  const emitted = new Set<string>()
  const items: LayerPanelItem[] = []
  layers.forEach((layer) => {
    const key = getLayerGroupKey(layer)
    const members = key ? membersByKey.get(key) ?? [] : []
    if (members.length < 2) {
      items.push({ kind: 'layer', id: `layer:${layer.id}`, layer })
      return
    }
    if (emitted.has(key)) return
    emitted.add(key)
    items.push({ kind: 'group', id: `group:${key}`, key, label: key, members })
  })
  return items
}

export const expandPanelItemsToLayerIds = (items: LayerPanelItem[]): string[] =>
  items.flatMap((item) => item.kind === 'group' ? item.members.map((layer) => layer.id) : [item.layer.id])

export const retainExistingExpandedGroups = (
  expanded: Set<string>,
  items: LayerPanelItem[],
): Set<string> => {
  const existing = new Set(items.filter((item) => item.kind === 'group').map((item) => item.key))
  return new Set([...expanded].filter((key) => existing.has(key)))
}
```

- [ ] **Step 4: Run the target test and verify GREEN**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts`

Expected: 5 tests pass.

- [ ] **Step 5: Commit the pure model**

```bash
git add src/components/panels/layerPanelGrouping.ts src/components/panels/layerPanelGrouping.test.ts
git commit -m "添加图层分组折叠模型"
```

### Task 2: Render collapsed summaries and expanded members

**Files:**
- Modify: `src/components/panels/LayerPanel.vue`
- Test: `src/components/panels/layerPanelGrouping.test.ts`

- [ ] **Step 1: Add a failing test proving expanded groups retain their summary and expose members**

Add `isExpanded` to group items through a `Set<string>` argument and assert:

```ts
const items = buildLayerPanelItems(
  [layer('steps-label', 'Steps'), layer('steps-value', 'Steps')],
  new Set(['Steps']),
)
expect(items[0]).toMatchObject({ kind: 'group', key: 'Steps', isExpanded: true })
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts`

Expected: FAIL because group items do not expose `isExpanded`.

- [ ] **Step 3: Add expansion state to the pure model**

Change the group union and builder signature:

```ts
| { kind: 'group'; id: string; key: string; label: string; members: LayerElement[]; isExpanded: boolean }

export const buildLayerPanelItems = (
  layers: LayerElement[],
  expanded = new Set<string>(),
): LayerPanelItem[] => {
  const membersByKey = new Map<string, LayerElement[]>()
  layers.forEach((layer) => {
    const key = getLayerGroupKey(layer)
    if (!key || layer.eleType === 'global' || layer.eleType === 'background') return
    membersByKey.set(key, [...(membersByKey.get(key) ?? []), layer])
  })

  const emitted = new Set<string>()
  const items: LayerPanelItem[] = []
  layers.forEach((layer) => {
    const key = getLayerGroupKey(layer)
    const members = key ? membersByKey.get(key) ?? [] : []
    if (members.length < 2) {
      items.push({ kind: 'layer', id: `layer:${layer.id}`, layer })
      return
    }
    if (emitted.has(key)) return
    emitted.add(key)
  items.push({
    kind: 'group',
    id: `group:${key}`,
    key,
    label: key,
    members,
    isExpanded: expanded.has(key),
  })
  })
  return items
}
```

- [ ] **Step 4: Replace the draggable list with panel items and render group blocks**

In `LayerPanel.vue`:

```ts
import { ActiveSelection } from 'fabric'
import {
  buildLayerPanelItems,
  expandPanelItemsToLayerIds,
  getLayerGroupKey,
  retainExistingExpandedGroups,
  type LayerPanelItem,
} from './layerPanelGrouping'

const expandedGroupKeys = ref(new Set<string>())
const panelItems = ref<LayerPanelItem[]>([])

const rebuildPanelItems = (): void => {
  const nextItems = buildLayerPanelItems(panelLayers.value, expandedGroupKeys.value)
  expandedGroupKeys.value = retainExistingExpandedGroups(expandedGroupKeys.value, nextItems)
  panelItems.value = buildLayerPanelItems(panelLayers.value, expandedGroupKeys.value)
}

const toggleGroup = (key: string): void => {
  const next = new Set(expandedGroupKeys.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expandedGroupKeys.value = next
  panelItems.value = buildLayerPanelItems(panelLayers.value, next)
}
```

Change `<draggable :list="layers">` to `<draggable :list="panelItems">`. Render each `group` item as one `.layer-group-block` containing:

```vue
<button
  class="layer-group-summary layer-content"
  type="button"
  :aria-expanded="item.isExpanded"
  @click.stop="selectLayerGroup(item)"
  @dblclick.stop="toggleGroup(item.key)"
>
  <span class="layer-group-toggle" @click.stop="toggleGroup(item.key)">
    <Icon :icon="item.isExpanded ? 'material-symbols:expand-more' : 'material-symbols:chevron-right'" />
  </span>
  <span class="layer-group-summary-name">{{ item.label }}</span>
  <span class="layer-group-count">{{ item.members.length }} 项</span>
</button>
```

Immediately after the summary button, add a `.layer-group-members` container guarded by `v-if="item.isExpanded"`. Inside it, repeat the complete current `.layer-row` block from `LayerPanel.vue` lines 38–96 with `v-for="layer in item.members" :key="layer.id"`; keep all row bindings and actions unchanged. Keep ordinary `layer` items on the same existing row markup. This intentional duplication avoids a broad row-component extraction in this feature.

- [ ] **Step 5: Add focused group styles**

Add styles in `LayerPanel.vue` using existing Studio tokens:

```css
.layer-group-block {
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  overflow: hidden;
}

.layer-group-summary {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--studio-text);
  cursor: pointer;
  text-align: left;
}

.layer-group-summary-name { flex: 1; font-weight: 700; }
.layer-group-count { color: var(--studio-text-muted); font-size: 12px; }
.layer-group-members { display: grid; gap: 4px; padding: 0 6px 6px 18px; }
```

- [ ] **Step 6: Run target tests and typecheck**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts src/components/panels/layerPanelOrder.test.ts && npm run typecheck`

Expected: all target tests pass and typecheck exits 0.

- [ ] **Step 7: Commit the rendering change**

```bash
git add src/components/panels/LayerPanel.vue src/components/panels/layerPanelGrouping.ts src/components/panels/layerPanelGrouping.test.ts
git commit -m "优化图层分组折叠展示"
```

### Task 3: Add whole-group selection and automatic expansion

**Files:**
- Modify: `src/components/panels/LayerPanel.vue`
- Test: `src/components/panels/layerPanelGrouping.test.ts`

- [ ] **Step 1: Write a failing pure test for selected-member group lookup**

Add `findCollapsedGroupsForLayerIds(items, ids)` and test:

```ts
expect(findCollapsedGroupsForLayerIds(items, ['steps-value'])).toEqual(['Steps'])
expect(findCollapsedGroupsForLayerIds(items, ['time'])).toEqual([])
expect(findCollapsedGroupsForLayerIds(items, ['steps-label', 'steps-value'])).toEqual([])
```

- [ ] **Step 2: Run the target test and verify RED**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts`

Expected: FAIL because `findCollapsedGroupsForLayerIds` is missing.

- [ ] **Step 3: Implement selected-member lookup**

```ts
export const findCollapsedGroupsForLayerIds = (
  items: LayerPanelItem[],
  ids: string[],
): string[] => {
  if (ids.length !== 1) return []
  const selected = new Set(ids.map(String))
  return items
    .filter((item): item is Extract<LayerPanelItem, { kind: 'group' }> => item.kind === 'group')
    .filter((item) => !item.isExpanded && item.members.some((member) => selected.has(String(member.id))))
    .map((item) => item.key)
}
```

- [ ] **Step 4: Implement whole-group selection**

```ts
const selectLayerGroup = (item: Extract<LayerPanelItem, { kind: 'group' }>): void => {
  const canvas = baseStore.canvas
  if (!canvas) return
  const objects = item.members
    .filter((layer) => !layer.locked && layer.selectable !== false)
    .map((layer) => getElementById(layer.id) ?? layer.element)
    .filter(Boolean)
  if (!objects.length) return

  canvas.discardActiveObject?.()
  const selection = new ActiveSelection(objects as any[], { canvas } as any)
  canvas.setActiveObject?.(selection as any)
  const ids = item.members
    .filter((layer) => !layer.locked && layer.selectable !== false)
    .map((layer) => String(layer.id))
  canvasStore.setActiveIds(ids)
  layerStore.setSelected(ids)
  activeElements.value = objects as MinimalFabricLike[]
  selectedIds.value = ids
  canvas.requestRenderAll?.()
}
```

- [ ] **Step 5: Auto-expand when canvas selection contains a hidden member**

Watch `selectedIds` and add missing keys to a fresh Set to preserve Vue reactivity:

```ts
watch(selectedIds, (ids) => {
  const keys = findCollapsedGroupsForLayerIds(panelItems.value, ids)
  if (!keys.length) return
  const next = new Set(expandedGroupKeys.value)
  keys.forEach((key) => next.add(key))
  expandedGroupKeys.value = next
  panelItems.value = buildLayerPanelItems(panelLayers.value, next)
})
```

- [ ] **Step 6: Run target tests and typecheck**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts && npm run typecheck`

Expected: target tests pass and typecheck exits 0.

- [ ] **Step 7: Commit selection behavior**

```bash
git add src/components/panels/LayerPanel.vue src/components/panels/layerPanelGrouping.ts src/components/panels/layerPanelGrouping.test.ts
git commit -m "添加图层分组选择与自动展开"
```

### Task 4: Preserve group drag ordering and run full verification

**Files:**
- Modify: `src/components/panels/LayerPanel.vue`
- Modify: `src/components/panels/layerPanelGrouping.test.ts`
- Modify: `src/components/panels/layerPanelOrder.test.ts`

- [ ] **Step 1: Add a failing test for converting a moved collapsed group to canvas order**

```ts
const items = buildLayerPanelItems([
  layer('time'),
  layer('steps-label', 'Steps'),
  layer('steps-value', 'Steps'),
  layer('date'),
])
const moved = [items[1], items[0], items[2]]
expect(resolvePanelItemsToCanvasIds(moved)).toEqual([
  'date',
  'time',
  'steps-value',
  'steps-label',
])
```

- [ ] **Step 2: Run the target test and verify the assertion catches incorrect flattening**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts`

Expected: FAIL because `resolvePanelItemsToCanvasIds` does not exist.

- [ ] **Step 3: Implement conversion and connect draggable panel items to real canvas IDs**

In `layerPanelGrouping.ts`:

```ts
import { toCanvasLayerIds } from './layerPanelOrder'

export const resolvePanelItemsToCanvasIds = (items: LayerPanelItem[]): string[] =>
  toCanvasLayerIds(expandPanelItemsToLayerIds(items))
```

Replace direct reads from `layers.value` in drag resolution:

```ts
const resolveDragOrderIds = (): string[] => {
  return resolvePanelItemsToCanvasIds(panelItems.value)
}
```

Because a group is one outer draggable item, dragging its summary or any expanded member handle moves the whole block. Remove obsolete `layerDragSnapshot`, `getLayerGroupIds`, and `keepLayerGroupsContiguous` only after their responsibilities are covered by `LayerPanelItem` and the tests.

- [ ] **Step 4: Keep panel items synchronized without resetting expansion**

Update the `layerStore.layers` watcher:

```ts
watch(
  () => layerStore.layers,
  (nextLayers) => {
    if (isDraggingLayers.value) return
    panelLayers.value = toPanelLayers(nextLayers)
    const nextItems = buildLayerPanelItems(panelLayers.value, expandedGroupKeys.value)
    expandedGroupKeys.value = retainExistingExpandedGroups(expandedGroupKeys.value, nextItems)
    panelItems.value = buildLayerPanelItems(panelLayers.value, expandedGroupKeys.value)
  },
  { deep: true, immediate: true },
)
```

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run src/components/panels/layerPanelGrouping.test.ts src/components/panels/layerPanelOrder.test.ts src/engine/managers/layerManager.test.ts`

Expected: all focused tests pass.

- [ ] **Step 6: Run full verification**

Run: `npm run test:unit`

Expected: all unit tests pass with zero failures.

Run: `npm run build`

Expected: `vue-tsc --noEmit` and Vite production build exit 0. Existing Sass deprecation and chunk-size warnings are acceptable; new errors are not.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 7: Commit final integration**

```bash
git add src/components/panels/LayerPanel.vue src/components/panels/layerPanelGrouping.ts src/components/panels/layerPanelGrouping.test.ts src/components/panels/layerPanelOrder.test.ts
git commit -m "完成图层分组折叠交互"
```

## Manual acceptance checklist

- [ ] 打开包含同一 `dataProperty` 多个元素的设计时，分组默认只显示一条摘要。
- [ ] 单击箭头和双击摘要可展开/收起，单击摘要主体不会误触展开。
- [ ] 单击摘要主体会选择组内所有未锁定且可选择的元素。
- [ ] 从画布直接选择折叠组成员时，左侧自动展开并显示该成员。
- [ ] 折叠和展开状态下拖拽摘要/成员都移动整组，组内相对顺序不变。
- [ ] 保存并重新进入后图层画布顺序不变，分组恢复默认折叠。
- [ ] `background` 和 `global` 仍位于面板底部且不参与分组。
