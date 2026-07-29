# Wristo Visual Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let designers package up to five coordinated visual themes and let users switch background, hand set, center cap, and theme-managed existing color variables from Garmin Connect IQ settings.

**Architecture:** `RuntimeDesignConfig.visualThemes` is the versioned source of truth. Studio owns editing and preview, the API preserves the JSON snapshot, the scaffold converts every theme into deterministic resources, and SuperAlpha lazily loads one generated theme at runtime. Existing elements remain the geometry/layout source, and existing color properties gain an opt-in `themeMode`.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest, Spring Boot/Java/JUnit, Bash, Python/unittest, Jinja2, Garmin Monkey C.

---

## File Map

### `wristo-studio`

- Create `src/types/visualTheme.ts`: version-1 theme types and constants.
- Create `src/engine/services/visualThemeService.ts`: normalization, validation,
  legacy-theme creation, and asset/color resolution.
- Create `src/engine/services/visualThemeService.test.ts`: contract tests.
- Create `src/stores/visualThemeStore.ts`: saved themes plus editor-only preview state.
- Create `src/components/panels/settings/VisualThemeSettings.vue`: global manager.
- Create `src/components/panels/settings/VisualThemeAssetFields.vue`: focused asset form.
- Modify `src/types/app/config.ts`: add optional `visualThemes`.
- Modify `src/types/properties.ts`: add `themeMode`.
- Modify `src/engine/services/exportService.ts`: serialize and validate themes and
  resolve original analog-asset URLs.
- Modify `src/engine/services/exportService.test.ts`: export coverage.
- Modify `src/engine/services/designAssetBundleService.ts`: collect theme assets.
- Modify `src/engine/services/designAssetBundleService.test.ts`: bundle coverage.
- Modify `src/stores/baseStore.ts`: include themes in create/generate paths.
- Modify `src/components/layout/AppMenu.vue`: mount the global
  `VisualThemeSettings.vue` entry/panel.
- Modify `src/i18n.ts`: English and Chinese labels/errors.

### `wristo-api`

- Create `src/test/java/com/wukong/face/modules/design/converter/DesignConverterVisualThemeTest.java`.
- Modify `src/main/java/com/wukong/face/modules/design/converter/DesignConverter.java`:
  keep the generic JSON-tree copy contract explicit.
- Create `src/main/java/com/wukong/face/modules/design/service/VisualThemeAssetReferenceService.java`:
  parse saved design snapshots and identify visual-theme asset references.
- Create `src/test/java/com/wukong/face/modules/design/service/VisualThemeAssetReferenceServiceTest.java`.
- Modify `src/main/java/com/wukong/face/modules/design/mapper/DesignMapper.java` and
  `src/main/resources/mapper/DesignMapper.xml`: list non-deleted config JSON for
  the rare destructive reference check.
- Modify `src/main/java/com/wukong/face/modules/design/service/impl/AnalogAssetServiceImpl.java`:
  reject deletion of referenced theme assets.

### `wristo-connectiq-app-build`

- Create `wristo-scaffold/lib/extract_visual_themes.py`: validate and normalize
  theme definitions into scaffold JSON.
- Create `wristo-scaffold/tests/test_visual_themes.py`: extraction and legacy tests.
- Modify `wristo-scaffold/generate-project.sh`: invoke extraction and convert
  per-theme assets.
- Modify `wristo-scaffold/lib/deal_analog_hand_svg.sh`: optional output name.
- Modify `wristo-scaffold/lib/deal_analog_center_cap.sh`: optional output name.
- Modify `wristo-scaffold/tests/test_analog_asset_url_fallback.py`: legacy/output-name tests.

### `wristo-apps/SuperAlpha`

- Modify `resources/drawables/drawables.j2.xml`: per-theme drawables.
- Modify `resources/settings/properties.j2.xml`: generated default `Theme`.
- Modify `resources/settings/settings.j2.xml`: generated theme selector and omit
  theme-managed standalone colors.
- Modify `resources/strings/strings.j2.xml`: theme title/names.
- Modify `source/SuperAlphaView.j2.mc`: validate, load, release, and redraw theme.
- Modify `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
  only for generated theme-aware color expressions.
- Create `wristo-connectiq-app-build/wristo-scaffold/tests/test_visual_theme_templates.py`.
- Modify `wristo-connectiq-app-build/wristo-scaffold/tests/test_settings_refresh_template.py`.
- Modify `wristo-connectiq-app-build/wristo-scaffold/tests/test_superalpha_runtime_slicing.py`.

## Task 1: Define and Validate the Studio Contract

**Files:**
- Create: `wristo-studio/src/types/visualTheme.ts`
- Create: `wristo-studio/src/engine/services/visualThemeService.ts`
- Test: `wristo-studio/src/engine/services/visualThemeService.test.ts`
- Modify: `wristo-studio/src/types/app/config.ts`
- Modify: `wristo-studio/src/types/properties.ts`

- [ ] **Step 1: Write failing contract tests**

Cover normalization of missing `themeMode` to `user`, one-to-five theme limits,
stable IDs, duplicate names, default-theme existence, required hour/minute
assets, `blob:` rejection, RGB565 colors, and rejection of overrides targeting
user-managed properties.

```ts
expect(normalizeThemeMode(undefined)).toBe('user')
expect(validateVisualThemes(validThemes, properties)).toEqual([])
expect(validateVisualThemes(duplicateNames, properties))
  .toContain('Theme names must be unique.')
expect(validateVisualThemes(blobOnlyTheme, properties))
  .toContain('Theme "Classic" hourHand requires a persistent assetId.')
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd /Users/mac/workspace/wristo/wristo-studio
npm run test:unit -- src/engine/services/visualThemeService.test.ts
```

Expected: FAIL because the visual-theme types/service do not exist.

- [ ] **Step 3: Add the version-1 types**

Define:

```ts
export type ThemeMode = 'theme' | 'user'
export type VisualThemeSelectionMode = 'user'
export type VisualThemeAssetSlot =
  | 'background' | 'hourHand' | 'minuteHand' | 'secondHand' | 'centerCap'

export interface VisualThemeAssetRef {
  assetId: number | null
  imageUrl: string | null
  targetSize?: number
}

export interface VisualTheme {
  id: string
  name: string
  assets: Partial<Record<VisualThemeAssetSlot, VisualThemeAssetRef>>
  colors: Record<string, string>
  fallbackHands: {
    hourColor: string
    minuteColor: string
    secondColor: string
  }
}

export interface VisualThemesConfig {
  version: 1
  enabled: boolean
  defaultThemeId: string
  selectionMode: 'user'
  themes: VisualTheme[]
}
```

Add `visualThemes?: VisualThemesConfig` to `RuntimeDesignConfig` and
`themeMode?: ThemeMode` to `PropertyItem`.

- [ ] **Step 4: Implement pure normalization and validation**

Export pure functions:

```ts
normalizeThemeMode(mode: unknown): ThemeMode
createInitialVisualThemes(config: RuntimeDesignConfig): VisualThemesConfig
validateVisualThemes(
  visualThemes: VisualThemesConfig | undefined,
  properties: PropertiesMap,
): string[]
resolveThemeColor(
  propertyKey: string,
  theme: VisualTheme,
  properties: PropertiesMap,
): string | undefined
```

Use `crypto.randomUUID()` only in the UI/store creation path; validation and
normalization must stay deterministic for tests and export.

- [ ] **Step 5: Run tests and type checking**

Run:

```bash
npm run test:unit -- src/engine/services/visualThemeService.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add src/types/visualTheme.ts src/types/app/config.ts src/types/properties.ts \
  src/engine/services/visualThemeService.ts \
  src/engine/services/visualThemeService.test.ts
git commit -m "add visual theme design contract"
```

## Task 2: Add the Studio Theme Store and Manager

**Files:**
- Create: `wristo-studio/src/stores/visualThemeStore.ts`
- Create: `wristo-studio/src/components/panels/settings/VisualThemeSettings.vue`
- Create: `wristo-studio/src/components/panels/settings/VisualThemeAssetFields.vue`
- Create: `wristo-studio/src/stores/visualThemeStore.test.ts`
- Modify: `wristo-studio/src/i18n.ts`
- Modify: `wristo-studio/src/components/layout/AppMenu.vue`

- [ ] **Step 1: Write failing store tests**

Test enable-from-legacy, add, duplicate with a new ID, rename, reorder, delete,
default protection, and preview/default separation.

```ts
store.enableFromDesign(config)
expect(store.config?.themes).toHaveLength(1)
store.setPreviewTheme('sport')
expect(store.previewThemeId).toBe('sport')
expect(store.config?.defaultThemeId).toBe('classic')
```

- [ ] **Step 2: Run the store test and verify it fails**

```bash
npm run test:unit -- src/stores/visualThemeStore.test.ts
```

Expected: FAIL because the store does not exist.

- [ ] **Step 3: Implement store actions**

Keep persistent `config` separate from editor-only `previewThemeId`. Provide
`hydrate`, `enableFromDesign`, `disable`, `addTheme`, `duplicateTheme`,
`renameTheme`, `removeTheme`, `moveTheme`, `setDefaultTheme`, `setPreviewTheme`,
`updateAsset`, `updateColor`, and `updateFallbackColor`.

- [ ] **Step 4: Run store tests**

```bash
npm run test:unit -- src/stores/visualThemeStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Implement the manager UI**

Use the existing compact Element Plus controls. Mount one global panel with:

- enable switch and Dynamic Theme Rule conflict warning;
- ordered theme tabs/list;
- add, duplicate, rename, delete, default, and preview actions;
- `VisualThemeAssetFields` using existing background/analog asset pickers;
- color rows filtered to `property.type === 'color' &&
  normalizeThemeMode(property.themeMode) === 'theme'`;
- fallback hand color rows.

Do not put theme CRUD into the individual hand panels.

- [ ] **Step 6: Add localized copy**

Add matching English/Chinese keys for `Visual Themes`, `Default`, `Preview`,
asset slots, validation errors, limit errors, and the Dynamic Theme Rule
conflict. End-user Connect IQ labels remain English; Studio UI includes both
locales.

- [ ] **Step 7: Run targeted tests and build**

```bash
npm run test:unit -- src/stores/visualThemeStore.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit the Studio manager**

Stage only the new store/components, the discovered host, and `src/i18n.ts`.

```bash
git commit -m "add visual theme manager"
```

## Task 3: Integrate Save, Export, Restore, and Asset Bundles

**Files:**
- Modify: `wristo-studio/src/engine/services/exportService.ts`
- Modify: `wristo-studio/src/engine/services/exportService.test.ts`
- Modify: `wristo-studio/src/engine/services/designAssetBundleService.ts`
- Modify: `wristo-studio/src/engine/services/designAssetBundleService.test.ts`
- Modify: `wristo-studio/src/stores/baseStore.ts`
- Modify: `wristo-studio/src/views/Design.vue`

- [ ] **Step 1: Add failing export tests**

Assert that generated config includes the hydrated `visualThemes`, validation
errors block export, and analog asset lookup resolves every themed hand/cap to
the original `file.url` while deduplicating repeated `assetId` requests.

- [ ] **Step 2: Run export tests and verify failure**

```bash
npm run test:unit -- src/engine/services/exportService.test.ts
```

Expected: FAIL because generated configs omit themes.

- [ ] **Step 3: Pass visual themes through generation**

Extend `GenerateConfigOptions` with `visualThemes?: VisualThemesConfig`.
Normalize a plain copy into `RuntimeDesignConfig`; do not serialize
`previewThemeId`.

Call `validateVisualThemes()` from `validateRuntimeConfigForExport()` and show
the returned concrete errors through the existing `ElMessage` path.

- [ ] **Step 4: Resolve themed asset URLs**

Generalize `resolvePackageAssetUrls()` so it walks both base package elements
and `visualThemes.themes[].assets`. Cache lookups by numeric `assetId`, replace
hand/cap `imageUrl` with `res.data.file.url`, and reject a `blob:` reference
without an ID.

- [ ] **Step 5: Add failing bundle tests**

Assert themed background/hands/cap appear in `manifest.json` groups and archive
paths, duplicate sources are downloaded once, and `config/config.json` retains
the complete theme configuration.

- [ ] **Step 6: Extend bundle collection**

Add a `collectVisualThemeAssetRefs(config)` pure helper that emits stable
semantic identities such as:

```text
theme-classic-background
theme-classic-hourHand
theme-classic-centerCap
```

Route background to `background` and hands/cap to `hands`.

- [ ] **Step 7: Hydrate and save through stores**

On design load, hydrate the visual-theme store from `config.visualThemes`. Pass
the store config into both `createDesign()` and `generateConfig()` calls in
`baseStore.ts`.

- [ ] **Step 8: Run tests and build**

```bash
npm run test:unit -- src/engine/services/exportService.test.ts \
  src/engine/services/designAssetBundleService.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit export integration**

```bash
git commit -m "persist visual theme assets"
```

## Task 4: Prove API Snapshot Preservation

**Files:**
- Create: `wristo-api/src/test/java/com/wukong/face/modules/design/converter/DesignConverterVisualThemeTest.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/converter/DesignConverter.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/service/VisualThemeAssetReferenceService.java`
- Create: `wristo-api/src/test/java/com/wukong/face/modules/design/service/VisualThemeAssetReferenceServiceTest.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/mapper/DesignMapper.java`
- Modify: `wristo-api/src/main/resources/mapper/DesignMapper.xml`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/service/impl/AnalogAssetServiceImpl.java`

- [ ] **Step 1: Write the preservation test**

Create a config JSON containing `visualThemes`, nested asset IDs, colors, and
`themeMode`. Copy it through the same converter path used for design copying.
Assert only `designId` changes and nested theme data is structurally equal.

- [ ] **Step 2: Run the test**

```bash
cd /Users/mac/workspace/wristo/wristo-api
mvn -Dtest=DesignConverterVisualThemeTest test
```

Expected before the production edit: FAIL because the converter helper is
private and has no directly testable preservation boundary.

- [ ] **Step 3: Expose a package-private preservation boundary**

Rename the helper to package-private `copyConfigJsonForDesign` without changing
its generic object-tree behavior:

```java
Map<String, Object> config =
    JsonUtils.parseObject(configJson, new TypeReference<Map<String, Object>>() {});
config.put("designId", newDesignUid);
return JsonUtils.toJsonString(config);
```

Do not introduce Java DTOs for every theme field.

- [ ] **Step 4: Write failing asset-reference tests**

Give the reference service one legacy config, one visual-theme config containing
the requested numeric `assetId`, and one unrelated config. Assert it returns
true only for the themed reference and tolerates malformed legacy JSON.

- [ ] **Step 5: Implement the destructive-action guard**

Add `DesignMapper.selectActiveConfigJsons()`. Parse only
`visualThemes.themes[].assets.*.assetId` in
`VisualThemeAssetReferenceService`; do not recursively match unrelated numeric
fields. Before `AnalogAssetServiceImpl` deletes files or rows, throw the
existing parameter/business exception with:

```text
Analog asset is referenced by a visual theme and cannot be deleted.
```

- [ ] **Step 6: Rerun targeted and design tests**

```bash
mvn -Dtest=DesignConverterVisualThemeTest,VisualThemeAssetReferenceServiceTest,DesignServiceImplTest test
```

Expected: PASS.

- [ ] **Step 7: Commit API preservation and guard**

```bash
git add src/main/java/com/wukong/face/modules/design/converter/DesignConverter.java \
  src/main/java/com/wukong/face/modules/design/service/VisualThemeAssetReferenceService.java \
  src/main/java/com/wukong/face/modules/design/service/impl/AnalogAssetServiceImpl.java \
  src/main/java/com/wukong/face/modules/design/mapper/DesignMapper.java \
  src/main/resources/mapper/DesignMapper.xml \
  src/test/java/com/wukong/face/modules/design/converter/DesignConverterVisualThemeTest.java \
  src/test/java/com/wukong/face/modules/design/service/VisualThemeAssetReferenceServiceTest.java
git commit -m "preserve visual themes in design copies"
```

## Task 5: Normalize Themes in the Scaffold

**Files:**
- Create: `wristo-connectiq-app-build/wristo-scaffold/lib/extract_visual_themes.py`
- Create: `wristo-connectiq-app-build/wristo-scaffold/tests/test_visual_themes.py`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/generate-project.sh`

- [ ] **Step 1: Write failing Python tests**

Cover legacy/no-theme output, disabled output, stable numeric ordering, default
index, base fallback, optional slots, five-theme limit, invalid IDs/colors, and
missing required hands.

- [ ] **Step 2: Run and verify failure**

```bash
cd /Users/mac/workspace/wristo/wristo-connectiq-app-build
python3 -m unittest wristo-scaffold.tests.test_visual_themes -v
```

Expected: FAIL because the extractor does not exist.

- [ ] **Step 3: Implement the extractor**

CLI:

```text
extract_visual_themes.py <conf.json> <themes.json>
```

Output:

```json
{
  "enabled": true,
  "defaultIndex": 0,
  "themes": [
    {
      "id": "classic",
      "index": 0,
      "name": "Classic",
      "assets": {},
      "colors": {},
      "fallbackHands": {}
    }
  ]
}
```

Raise `ValueError` messages containing theme ID and slot.

- [ ] **Step 4: Integrate extraction into generation**

Run the extractor after `elements.json` creation. Merge normalized theme JSON
into the Jinja input used for drawables/settings/source. Preserve the current
legacy branch when themes are absent.

- [ ] **Step 5: Run tests and shell syntax**

```bash
python3 -m unittest wristo-scaffold.tests.test_visual_themes -v
bash -n wristo-scaffold/generate-project.sh
```

Expected: PASS.

- [ ] **Step 6: Commit normalized scaffold data**

```bash
git commit -m "normalize visual themes for packaging"
```

## Task 6: Generate Per-Theme Asset Files

**Files:**
- Modify: `wristo-connectiq-app-build/wristo-scaffold/lib/deal_analog_hand_svg.sh`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/lib/deal_analog_center_cap.sh`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/generate-project.sh`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_analog_asset_url_fallback.py`

- [ ] **Step 1: Add failing output-name tests**

Invoke the hand script with `theme1HourHand` and assert it writes
`theme1HourHand.png`; invoke the existing argument form and assert it still
writes `hourHand.png`. Add equivalent center-cap coverage.

- [ ] **Step 2: Run and verify failure**

```bash
python3 -m unittest wristo-scaffold.tests.test_analog_asset_url_fallback -v
```

Expected: themed output-name assertion fails.

- [ ] **Step 3: Add backward-compatible output arguments**

Read the optional final argument:

```bash
OUTPUT_NAME="${6:-${ELE_TYPE}}"
```

Validate with `^[A-Za-z][A-Za-z0-9_]*$` before composing a path. Apply the
corresponding positional argument to the center-cap script without changing its
legacy default.

- [ ] **Step 4: Loop through normalized themes**

In `generate-project.sh`, convert:

```text
theme{index}Background
theme{index}HourHand
theme{index}MinuteHand
theme{index}SecondHand
theme{index}CenterCap
```

Skip optional absent slots. Fail the step with theme ID/slot context when a
conversion fails.

- [ ] **Step 5: Run tests and syntax checks**

```bash
python3 -m unittest wristo-scaffold.tests.test_analog_asset_url_fallback \
  wristo-scaffold.tests.test_visual_themes -v
bash -n wristo-scaffold/generate-project.sh
bash -n wristo-scaffold/lib/deal_analog_hand_svg.sh
bash -n wristo-scaffold/lib/deal_analog_center_cap.sh
```

Expected: PASS.

- [ ] **Step 6: Commit asset generation**

```bash
git commit -m "generate visual theme assets"
```

## Task 7: Generate Garmin Resources and Settings

**Files:**
- Modify: `wristo-apps/SuperAlpha/resources/drawables/drawables.j2.xml`
- Modify: `wristo-apps/SuperAlpha/resources/settings/properties.j2.xml`
- Modify: `wristo-apps/SuperAlpha/resources/settings/settings.j2.xml`
- Modify: the discovered strings Jinja template
- Create: `wristo-connectiq-app-build/wristo-scaffold/tests/test_visual_theme_templates.py`

- [ ] **Step 1: Write failing template tests**

Render two themes and assert unique drawables, default numeric property, list
entries, escaped names, optional slot omission, one-theme selector omission,
and omission of standalone settings for `themeMode=theme` color properties.

- [ ] **Step 2: Run and verify failure**

```bash
cd /Users/mac/workspace/wristo/wristo-connectiq-app-build
python3 -m unittest wristo-scaffold.tests.test_visual_theme_templates -v
```

Expected: FAIL because templates do not consume normalized themes.

- [ ] **Step 3: Render theme drawables**

Emit each present normalized asset using deterministic IDs and filenames. Keep
the existing legacy drawable branch when Visual Themes are absent.

- [ ] **Step 4: Render properties, settings, and strings**

Set `Theme` to `visualThemes.defaultIndex`. Emit the selector only when enabled
with more than one theme. Escape display names through Jinja XML escaping.
Filter color-property settings with:

```jinja2
prop.type == "color" and (prop.themeMode | default("user")) == "user"
```

- [ ] **Step 5: Run template and existing settings tests**

```bash
python3 -m unittest \
  wristo-scaffold.tests.test_visual_theme_templates \
  wristo-scaffold.tests.test_settings_runtime_contract \
  wristo-scaffold.tests.test_settings_refresh_template -v
```

Expected: PASS.

- [ ] **Step 6: Commit generated resources**

Commit in the repository that owns each edited template, keeping the
`wristo-apps` and `wristo-connectiq-app-build` commits separate.

```bash
git commit -m "generate visual theme settings"
```

## Task 8: Add Lazy Runtime Theme Switching

**Files:**
- Modify: `wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_settings_refresh_template.py`
- Modify: `wristo-connectiq-app-build/wristo-scaffold/tests/test_superalpha_runtime_slicing.py`

- [ ] **Step 1: Add failing source-template assertions**

Assert generated source contains `normalizeThemeIndex`, `releaseVisualTheme`,
`loadVisualTheme`, a generated switch, early return on unchanged selection,
draw-option reinitialization, and no visual-theme runtime for legacy designs.

- [ ] **Step 2: Run and verify failure**

```bash
cd /Users/mac/workspace/wristo/wristo-connectiq-app-build
python3 -m unittest \
  wristo-scaffold.tests.test_settings_refresh_template \
  wristo-scaffold.tests.test_superalpha_runtime_slicing -v
```

Expected: FAIL on missing runtime functions.

- [ ] **Step 3: Generate fixed theme state**

In the template, generate only the variables required by present slots and
theme-managed colors:

```monkeyc
private var currentTheme = -1;
private var themePrimaryColor = 0xFFFFFF;
```

Do not keep an array of loaded bitmaps or a color Dictionary.

- [ ] **Step 4: Implement index validation and lazy loading**

`normalizeThemeIndex(raw)` returns the generated default for null, negative, or
out-of-range input. `loadVisualTheme(next)`:

1. returns when unchanged;
2. nulls old bitmap references;
3. executes the generated resource switch;
4. assigns fixed color variables and fallback colors;
5. updates `currentTheme`;
6. rebuilds color-dependent draw options.

- [ ] **Step 5: Route existing drawing through active theme values**

Keep one `hourHand`, `minuteHand`, `secondHand`, `centerCap`, and background
reference. Replace theme-managed raw property expressions with generated fixed
theme variables; leave `themeMode=user` reads unchanged.

Preserve existing `AffineTransform`, AOD, burn-in, and geometric fallback
branches. Feed the selected theme fallback colors into the existing geometric
hand calls.

- [ ] **Step 6: Refresh only when settings change**

In `onSettingsChangedSinceLastDraw()`, read `Theme`, normalize it, and call
`loadVisualTheme` only when it differs. Mark settings/draw caches dirty and
request the existing redraw path.

- [ ] **Step 7: Run template regression suite**

```bash
python3 -m unittest \
  wristo-scaffold.tests.test_visual_theme_templates \
  wristo-scaffold.tests.test_settings_refresh_template \
  wristo-scaffold.tests.test_superalpha_runtime_slicing \
  wristo-scaffold.tests.test_render_options_reuse_template \
  wristo-scaffold.tests.test_runtime_capabilities -v
```

Expected: PASS.

- [ ] **Step 8: Commit runtime switching**

Commit template and extractor changes in their owning repositories:

```bash
git commit -m "switch visual themes at runtime"
```

## Task 9: Add Dynamic-Rule Conflict Guard

**Files:**
- Modify: `wristo-studio/src/components/panels/settings/VisualThemeSettings.vue`
- Modify: `wristo-studio/src/components/panels/settings/ThemeRuleSettings.vue`
- Create or modify targeted component/store tests beside those components

- [ ] **Step 1: Write failing conflict tests**

Assert enabling Visual Themes while a Dynamic Theme Rule is active is blocked
with a localized message, and enabling a Dynamic Theme Rule while Visual Themes
are active is blocked. Neither action silently disables the other.

- [ ] **Step 2: Run and verify failure**

```bash
cd /Users/mac/workspace/wristo/wristo-studio
npm run test:unit -- src/components/panels/settings
```

Expected: conflict assertions fail.

- [ ] **Step 3: Implement a shared ownership check**

Add one pure helper to `visualThemeService.ts`:

```ts
canEnableThemeOwner(input: {
  visualThemesEnabled: boolean
  dynamicRuleActive: boolean
  requestedOwner: 'visual' | 'dynamic'
}): { allowed: boolean; messageKey?: string }
```

Both panels call the same helper before mutation/API calls.

- [ ] **Step 4: Run tests and build**

```bash
npm run test:unit -- src/engine/services/visualThemeService.test.ts \
  src/components/panels/settings
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit the conflict guard**

```bash
git commit -m "guard conflicting theme owners"
```

## Task 10: End-to-End Packaging Verification

**Files:**
- Add a compact two-theme fixture under
  `wristo-connectiq-app-build/wristo-scaffold/tests/fixtures/visual-themes/`.
- Add `wristo-connectiq-app-build/wristo-scaffold/tests/test_visual_theme_generation.py`.

- [ ] **Step 1: Create the fixture**

Use local SVG/raster fixtures with Classic and Sport themes, optional second
hand/cap differences, two theme-managed colors, and one user-managed color.
Keep assets minimal so the test does not depend on network or production APIs.

- [ ] **Step 2: Write the generation test**

Run the extraction/template generation boundary and assert:

- expected theme PNG/resource filenames;
- valid XML parsing for drawables/properties/settings/strings;
- generated Monkey C source references only declared resources;
- default index is correct;
- one legacy fixture remains unchanged.

- [ ] **Step 3: Run all targeted scaffold tests**

```bash
cd /Users/mac/workspace/wristo/wristo-connectiq-app-build
python3 -m unittest discover -s wristo-scaffold/tests -p 'test_*theme*.py' -v
```

Expected: PASS.

- [ ] **Step 4: Run full module verification**

```bash
cd /Users/mac/workspace/wristo/wristo-studio
npm run test:unit
npm run build

cd /Users/mac/workspace/wristo/wristo-api
mvn test

cd /Users/mac/workspace/wristo/wristo-connectiq-app-build
python3 -m unittest discover -s wristo-scaffold/tests -p 'test_*.py'
bash -n wristo-scaffold/generate-project.sh
```

Expected: all commands PASS. Report Connect IQ SDK compilation separately; do
not claim it unless an actual generated project is compiled with the installed
SDK.

- [ ] **Step 5: Perform manual Connect IQ verification**

Generate a local project from a non-production test `designUid`, compile/install
on one bitmap-transform device profile and one fallback profile, then verify:

- default theme on first install;
- generated English theme names;
- background/hands/cap/colors change together;
- unchanged selections do not visibly reload;
- invalid saved index falls back;
- AOD suppresses the second hand;
- fallback profile uses theme fallback colors.

- [ ] **Step 6: Commit fixture and end-to-end tests**

```bash
git commit -m "test visual theme packaging"
```

## Task 11: Documentation and Release Safety

**Files:**
- Modify: `wristo-studio/docs/superpowers/specs/2026-07-29-visual-theme-system-design.md`
  only if implementation decisions legitimately changed.
- Create: `wristo-studio/docs/visual-themes.md`

- [ ] **Step 1: Document designer constraints**

Document the five-theme limit, stable ordering after release, required hand
slots, persistent asset requirement, user/theme color modes, dynamic-rule
mutual exclusion, and low-end fallback limitation.

- [ ] **Step 2: Document verification evidence**

Record Studio unit/build, API Maven, scaffold Python/shell, actual Connect IQ
compile, and device/manual checks as separate evidence categories.

- [ ] **Step 3: Final dirty-worktree audit**

Run:

```bash
for repo in wristo-studio wristo-api wristo-connectiq-app-build wristo-apps; do
  git -C "/Users/mac/workspace/wristo/$repo" status --short
done
```

Expected: only intended changes or pre-existing unrelated user changes; never
reset or include unrelated files.

- [ ] **Step 4: Commit documentation in its owning repository**

```bash
git commit -m "document visual theme workflow"
```
