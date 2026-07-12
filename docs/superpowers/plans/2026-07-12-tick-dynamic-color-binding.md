# Tick Dynamic Color Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `tick12` and `tick60` bind directly to a project Color Property, persist `fill/fillProperty`, and preview the runtime mask tint in Studio.

**Architecture:** Add a reusable Color Property selector and a shared Tick color settings block. Keep binding/persistence in the common Dial schema/encoder/renderer, and isolate Fabric `BlendColor(mode: 'tint', alpha: 1)` handling in a tested helper so asset changes and color changes use the same preview path.

**Tech Stack:** Vue 3, TypeScript, Pinia, Fabric 6.7, Vitest, Vite

---

### Task 1: Color Property selector

**Files:**
- Create: `src/elements/common/settings/ColorPropertyField.vue`
- Create: `src/elements/common/settings/colorProperty.ts`
- Create: `src/elements/common/settings/colorProperty.test.ts`

- [ ] **Step 1: Write failing tests for color-property options and values**

Test pure helpers that filter only `type === 'color'`, normalize `0xRRGGBB/#RRGGBB/RRGGBB` to lowercase `#rrggbb`, map `-1` to `transparent`, and return `#ffffff` for missing/invalid values.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npx vitest run src/elements/common/settings/colorProperty.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement helpers and selector**

`ColorPropertyField.vue` follows `DataPropertyField.vue`: clearable/filterable select, `PropertySelectOption`, color swatch/detail, `update:modelValue` and `change`, and footer action:

```ts
emitter.emit('open-app-properties', { type: 'color' })
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Expected: all helper cases pass.

### Task 2: Tick binding model and Fabric preview

**Files:**
- Modify: `src/elements/dials/common/dial.schema.ts`
- Create: `src/elements/dials/common/dialColor.ts`
- Create: `src/elements/dials/common/dialColor.test.ts`
- Modify: `src/elements/dials/common/dial.renderer.ts`
- Modify: `src/elements/dials/common/dial.encoder.ts`

- [ ] **Step 1: Write failing Dial color tests**

Cover these contracts:

```ts
resolveDialColorPatch('accentColor', properties) // { fillProperty: 'accentColor', fill: '#9eea20' }
resolveDialColorPatch('', properties, '#123456') // { fillProperty: '', fill: '#123456' }
```

For a mocked Fabric image, verify dynamic binding replaces only the helper-owned `BlendColor` filter with `{ mode: 'tint', alpha: 1, color }`, calls `applyFilters()`, and clearing the binding removes that filter while preserving unrelated filters.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npx vitest run src/elements/dials/common/dialColor.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the Dial contract**

Add `fillProperty?: string` to `DialElementConfig`. Implement `applyDialColorPreview(image, fill, fillProperty)` with Fabric `BlendColor` in `tint` mode and a private marker on the created filter.

Update `createDial` to set default `fill: config.fill || '#ffffff'`, persist `fillProperty`, and apply the preview. Update `updateDial` to preserve these fields when replacing an image, apply color patches, and rerun the filter after image or binding changes.

Update `encodeDial/decodeDial` to include `fillProperty` alongside `fill`.

- [ ] **Step 4: Run Dial tests and verify GREEN**

Expected: all patch/filter tests pass.

### Task 3: Shared Tick color UI

**Files:**
- Create: `src/elements/dials/common/TickColorSettings.vue`
- Modify: `src/elements/dials/tick12/tick12.panel.vue`
- Modify: `src/elements/dials/tick60/tick60.panel.vue`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Write a failing source-contract test**

Create `src/elements/dials/common/TickColorSettings.test.ts` that reads both panel SFC sources and asserts each imports/renders `TickColorSettings`, while `romans.panel.vue` does not. Assert the shared component contains `ColorPropertyField`, `ColorPicker`, and emits patches containing both `fillProperty` and `fill`.

- [ ] **Step 2: Run focused test and verify RED**

Expected: missing component/import assertions fail.

- [ ] **Step 3: Implement shared settings**

The component receives the same `element/config/applyPatch` contract used by the panels. On variable selection, read the selected property via `usePropertiesStore`, normalize its value, and apply `{ fillProperty: key, fill: color }`. On clear, apply `{ fillProperty: '' }`. On fallback color change, apply `{ fill: color }` without changing the current key.

Render it after `AssetPicker` in only the `tick12/tick60` panels. Add English and Chinese labels for Dynamic Color Variable and Preview/Fallback Color.

- [ ] **Step 4: Run the UI contract test and verify GREEN**

Expected: both Tick panels and exclusion of Romans pass.

### Task 4: Regression verification and integration

**Files:**
- Test only

- [ ] **Step 1: Run focused tests**

```bash
npx vitest run \
  src/elements/common/settings/colorProperty.test.ts \
  src/elements/dials/common/dialColor.test.ts \
  src/elements/dials/common/TickColorSettings.test.ts
```

- [ ] **Step 2: Run all unit tests**

```bash
npm run test:unit
```

Expected: all assertions pass; record the approved `canvas.node` ABI baseline errors if still present.

- [ ] **Step 3: Run typecheck and build**

```bash
npm run typecheck
npm run build
```

Expected: both exit 0. If the concurrent dependency install temporarily breaks `.bin`, use direct installed module entrypoints without changing `package.json`, `package-lock.json`, or `.nvmrc`.

- [ ] **Step 4: Verify and commit only task files**

```bash
git diff --check
git status --short
git add src/elements/common/settings/ColorPropertyField.vue \
  src/elements/common/settings/colorProperty.ts \
  src/elements/common/settings/colorProperty.test.ts \
  src/elements/dials/common/dial.schema.ts \
  src/elements/dials/common/dialColor.ts \
  src/elements/dials/common/dialColor.test.ts \
  src/elements/dials/common/dial.renderer.ts \
  src/elements/dials/common/dial.encoder.ts \
  src/elements/dials/common/TickColorSettings.vue \
  src/elements/dials/common/TickColorSettings.test.ts \
  src/elements/dials/tick12/tick12.panel.vue \
  src/elements/dials/tick60/tick60.panel.vue \
  src/i18n.ts
git commit -m "add dynamic color binding for ticks"
```
