# Tick Single Color Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Tick variable selector and fallback color input with one ColorPicker that distinguishes static colors from project Color Properties.

**Architecture:** Add a backward-compatible `property-change` event to the shared ColorPicker. TickColorSettings listens to that event and writes `fill/fillProperty` together, while existing ColorPicker consumers continue using unchanged `change` and `update:modelValue` events.

**Tech Stack:** Vue 3, TypeScript, Pinia, Fabric 6.7, Vitest, Vite

---

### Task 1: ColorPicker property-selection event

**Files:**
- Modify: `src/components/color-picker/index.vue`
- Create: `src/components/color-picker/colorSelection.ts`
- Create: `src/components/color-picker/colorSelection.test.ts`

- [ ] **Step 1: Write failing event-payload tests**

Test a pure helper that maps a variable option `{ hex, propertyKey }` to `{ color: hex, propertyKey }`, and maps ordinary matrix/manual colors to `{ color, propertyKey: '' }`.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run src/components/color-picker/colorSelection.test.ts
```

- [ ] **Step 3: Implement helper and event**

Declare the new event without changing existing events:

```ts
emit('property-change', toColorSelectionPayload(color))
```

Emit it from `selectColor`, transparent selection, and valid manual-input paths. Variable options retain `propertyKey`; all ordinary colors emit an empty key.

- [ ] **Step 4: Verify GREEN**

Expected: all payload cases pass.

### Task 2: Reduce TickColorSettings to one ColorPicker

**Files:**
- Modify: `src/elements/dials/common/TickColorSettings.vue`
- Modify: `src/elements/dials/common/TickColorSettings.test.ts`
- Delete: `src/elements/common/settings/ColorPropertyField.vue`
- Delete: `src/elements/common/settings/colorProperty.ts`
- Delete: `src/elements/common/settings/colorProperty.test.ts`
- Modify: `src/elements/dials/common/dialColor.ts`
- Modify: `src/elements/dials/common/dialColor.test.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Update UI tests and verify RED**

Assert TickColorSettings contains exactly one `ColorPicker`, contains no `ColorPropertyField`, listens to `@property-change`, and applies both `fill` and `fillProperty`. Keep the existing tick12/tick60 inclusion and Romans exclusion assertions.

- [ ] **Step 2: Implement the single control**

Render one form item labeled `Tick Color / 刻度颜色`. Handle payloads as:

```ts
applyUpdate({
  fill: payload.color,
  fillProperty: payload.propertyKey,
})
```

Remove the no-longer-used ColorPropertyField and color-property helpers. Move the small color normalization helper into `dialColor.ts` or `colorSelection.ts` so Dial persistence and tint behavior remain unchanged.

- [ ] **Step 3: Verify GREEN**

Run ColorPicker and Tick focused tests.

### Task 3: Regression and integration

**Files:**
- Test only

- [ ] **Step 1: Run focused tests**

```bash
npx vitest run \
  src/components/color-picker/colorSelection.test.ts \
  src/elements/dials/common/dialColor.test.ts \
  src/elements/dials/common/dial.encoder.test.ts \
  src/elements/dials/common/TickColorSettings.test.ts
```

- [ ] **Step 2: Run all tests, typecheck, and build**

```bash
npm run test:unit
npm run typecheck
npm run build
```

- [ ] **Step 3: Commit only correction files**

```bash
git diff --check
git add src/components/color-picker/index.vue \
  src/components/color-picker/colorSelection.ts \
  src/components/color-picker/colorSelection.test.ts \
  src/elements/common/settings/ColorPropertyField.vue \
  src/elements/common/settings/colorProperty.ts \
  src/elements/common/settings/colorProperty.test.ts \
  src/elements/dials/common/TickColorSettings.vue \
  src/elements/dials/common/TickColorSettings.test.ts \
  src/elements/dials/common/dialColor.ts \
  src/elements/dials/common/dialColor.test.ts \
  src/i18n.ts
git commit -m "simplify tick color binding control"
```
