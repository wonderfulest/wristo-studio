# Editable Tick SVG Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the existing SVG editor for every SVG asset in the `tick12` and `tick60` asset libraries without enabling it for PNG or `romans` assets.

**Architecture:** Move the asset-type and SVG-extension predicate from the AssetPicker SFC into a small pure utility. Extend its whitelist with `tick12` and `tick60`, then have AssetPicker call the tested predicate while leaving the existing editor/save/upload flow unchanged.

**Tech Stack:** Vue 3, TypeScript, Vitest, Vite

---

### Task 1: Test and implement tick SVG editability

**Files:**
- Create: `src/components/asset-picker/assetEditability.ts`
- Create: `src/components/asset-picker/assetEditability.test.ts`
- Modify: `src/components/asset-picker/index.vue`

- [ ] **Step 1: Write the failing test**

Create parameterized Vitest cases:

```ts
import { describe, expect, it } from 'vitest'
import { isEditableSvgAssetSource } from './assetEditability'

describe('isEditableSvgAssetSource', () => {
  it.each(['tick12', 'tick60'] as const)('allows %s SVG assets', (assetType) => {
    expect(isEditableSvgAssetSource(assetType, 'https://cdn.example/ticks.svg', '')).toBe(true)
    expect(isEditableSvgAssetSource(assetType, '', 'ticks.svg')).toBe(true)
  })

  it.each(['tick12', 'tick60'] as const)('rejects %s PNG assets', (assetType) => {
    expect(isEditableSvgAssetSource(assetType, 'https://cdn.example/ticks.png', 'ticks.png')).toBe(false)
  })

  it('does not enable romans SVG editing', () => {
    expect(isEditableSvgAssetSource('romans', 'https://cdn.example/romans.svg', '')).toBe(false)
  })

  it('recognizes SVG URLs with query strings case-insensitively', () => {
    expect(isEditableSvgAssetSource('tick12', 'https://cdn.example/TICKS.SVG?v=2', '')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
npx vitest run src/components/asset-picker/assetEditability.test.ts
```

Expected: failure because `assetEditability.ts` does not exist.

- [ ] **Step 3: Implement the pure predicate**

```ts
import type { AnalogAssetType } from '@/types/api/analog-asset'

const editableSvgAssetTypes = new Set<AnalogAssetType>([
  'image',
  'hour',
  'minute',
  'second',
  'center_cap',
  'tick12',
  'tick60',
])

const isSvgSource = (value?: string): boolean =>
  String(value || '').split('?')[0].toLowerCase().endsWith('.svg')

export const isEditableSvgAssetSource = (
  assetType: AnalogAssetType,
  url?: string,
  name?: string,
): boolean => editableSvgAssetTypes.has(assetType) && (isSvgSource(url) || isSvgSource(name))
```

- [ ] **Step 4: Wire AssetPicker to the predicate**

Import `isEditableSvgAssetSource`, delete the local `editableSvgAssetTypes` and `isSvgUrl`, and replace the local predicate body with:

```ts
const isEditableSvgAsset = (asset: AnalogAssetVO): boolean =>
  isEditableSvgAssetSource(props.assetType, asset.file?.url, asset.file?.name)
```

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
npx vitest run src/components/asset-picker/assetEditability.test.ts
```

Expected: all cases pass.

### Task 2: Regression verification

**Files:**
- Test only

- [ ] **Step 1: Run Studio unit tests**

```bash
npm run test:unit
```

Expected: zero failures.

- [ ] **Step 2: Run type checking**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Verify the diff**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only the three implementation files plus pre-existing user files appear.

- [ ] **Step 5: Commit the focused change**

```bash
git add \
  src/components/asset-picker/assetEditability.ts \
  src/components/asset-picker/assetEditability.test.ts \
  src/components/asset-picker/index.vue
git commit -m "enable SVG editing for tick assets"
```
