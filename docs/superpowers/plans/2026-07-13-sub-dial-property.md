# Sub-dial Dial Property Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Sub-dial auto/custom progress binding with explicit Goal/Range modes and reusable, backend-configured Dial Properties.

**Architecture:** Extend `data_type_option` with Dial capability metadata, load it through the existing Studio option API, and add a global `dial` property whose immutable mode filters compatible metrics. Sub-dial stores only `progressMode + dialProperty`; scaffold export resolves the property snapshot into a metric symbol and either a runtime goal or fixed range.

**Tech Stack:** Spring Boot/Java/MyBatis/Flyway, Vue 3/TypeScript/Pinia/Element Plus/Vitest, Python unittest/Jinja, Monkey C.

---

## File map

- `wristo-api`: migration, entity/DTO/VO/converter/mapper validation and API tests for Dial metadata.
- `wristo-studio/src/api/data-type-options.ts`, `src/types/{settings,properties}.ts`: shared transport and property contracts.
- `wristo-studio/src/components/properties/dialogs/DialPropertyDialog.vue`: create/edit one immutable-mode Dial Property.
- `wristo-studio/src/components/properties/PropertiesPanel.vue`, `src/stores/properties.ts`: global property lifecycle and reference cleanup.
- `wristo-studio/src/elements/common/settings/DialPropertyField.vue`: mode-filtered binding control.
- `wristo-studio/src/elements/dials/subDial/*`: new model, migration, preview, encoder and panel.
- `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`: resolve exported Dial Property snapshots.
- `wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`: explicit Goal/Range runtime branches.
- `wristo-apps/SuperBarrel/utils/dial-support.json`: machine-readable provider capability manifest.

### Task 1: Persist Dial capability metadata in the API

**Files:**
- Create: `../wristo-api/src/main/resources/db/migration/V40__data_type_option_dial_support.sql`
- Modify: `../wristo-api/src/main/java/com/wukong/face/modules/design/entity/DataTypeOption.java`
- Modify: `../wristo-api/src/main/java/com/wukong/face/modules/design/dto/DataTypeOptionCreateDTO.java`
- Modify: `../wristo-api/src/main/java/com/wukong/face/modules/design/dto/DataTypeOptionUpdateDTO.java`
- Modify: `../wristo-api/src/main/java/com/wukong/face/modules/design/vo/DataTypeOptionVO.java`
- Modify: `../wristo-api/src/main/resources/mapper/DataTypeOptionMapper.xml`
- Test: `../wristo-api/src/test/java/com/wukong/face/modules/design/converter/DataTypeOptionConverterTest.java`

- [ ] **Step 1: Add failing converter assertions**

Add a case that maps `dialMode="range"`, `dialMin=0`, `dialMax=100`, and a Goal case with `dialGoalSource="garmin"`; assert every value survives entity-to-VO conversion.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd ../wristo-api && mvn -Dtest=DataTypeOptionConverterTest test`

Expected: compilation or assertion failure because Dial fields do not exist.

- [ ] **Step 3: Add the migration and Java fields**

```sql
ALTER TABLE data_type_option
  ADD COLUMN dial_mode VARCHAR(16) NULL,
  ADD COLUMN dial_min DECIMAL(18,6) NULL,
  ADD COLUMN dial_max DECIMAL(18,6) NULL,
  ADD COLUMN dial_goal_source VARCHAR(16) NULL;
```

Use `String dialMode`, `BigDecimal dialMin`, `BigDecimal dialMax`, and `String dialGoalSource` consistently in entity, DTOs and VO. Add the four columns to mapper result maps and insert/update SQL.

- [ ] **Step 4: Run the focused test**

Run: `cd ../wristo-api && mvn -Dtest=DataTypeOptionConverterTest test`

Expected: PASS.

- [ ] **Step 5: Commit in wristo-api**

```bash
git -C ../wristo-api add src/main/resources/db/migration/V40__data_type_option_dial_support.sql src/main/java/com/wukong/face/modules/design src/main/resources/mapper/DataTypeOptionMapper.xml src/test/java/com/wukong/face/modules/design/converter/DataTypeOptionConverterTest.java
git -C ../wristo-api commit -m "add dial data type metadata"
```

### Task 2: Validate backend Dial configurations

**Files:**
- Modify: `../wristo-api/src/main/java/com/wukong/face/modules/design/service/impl/DataTypeOptionOrchestratorImpl.java`
- Test: `../wristo-api/src/test/java/com/wukong/face/modules/design/service/impl/DataTypeOptionOrchestratorImplTest.java`

- [ ] **Step 1: Write failing validation tests**

Cover: Goal clears/rejects bounds; Range requires finite ordered bounds; Range rejects goal source; unsupported mode rejects; null mode clears all Dial metadata.

- [ ] **Step 2: Verify failures**

Run: `cd ../wristo-api && mvn -Dtest=DataTypeOptionOrchestratorImplTest test`

Expected: new cases FAIL.

- [ ] **Step 3: Implement one normalization function**

```java
private void normalizeDialConfig(DataTypeOption target) {
    String mode = target.getDialMode();
    if (mode == null || mode.isBlank()) {
        target.setDialMode(null);
        target.setDialMin(null);
        target.setDialMax(null);
        target.setDialGoalSource(null);
        return;
    }
    if ("goal".equals(mode)) {
        target.setDialMin(null);
        target.setDialMax(null);
        if (!Set.of("garmin", "fixed").contains(target.getDialGoalSource())) {
            throw new IllegalArgumentException("Goal Dial requires garmin or fixed goal source");
        }
        return;
    }
    if ("range".equals(mode)) {
        target.setDialGoalSource(null);
        if (target.getDialMin() == null || target.getDialMax() == null || target.getDialMax().compareTo(target.getDialMin()) <= 0) {
            throw new IllegalArgumentException("Range Dial requires dialMax greater than dialMin");
        }
        return;
    }
    throw new IllegalArgumentException("Unsupported Dial mode: " + mode);
}
```

Call it from both create and update paths before persistence.

- [ ] **Step 4: Run service tests and API module tests**

Run: `cd ../wristo-api && mvn -Dtest=DataTypeOptionOrchestratorImplTest,DataTypeOptionConverterTest test`

Expected: PASS.

- [ ] **Step 5: Commit in wristo-api**

```bash
git -C ../wristo-api add src/main/java/com/wukong/face/modules/design/service/impl/DataTypeOptionOrchestratorImpl.java src/test/java/com/wukong/face/modules/design/service/impl/DataTypeOptionOrchestratorImplTest.java
git -C ../wristo-api commit -m "validate dial data type configuration"
```

### Task 3: Add Studio Dial metadata and global property types

**Files:**
- Modify: `src/api/data-type-options.ts`
- Modify: `src/config/elements/options/dataTypes.ts`
- Modify: `src/types/settings.ts`
- Modify: `src/types/properties.ts`
- Modify: `src/stores/properties.ts`
- Test: `src/stores/properties.test.ts`

- [ ] **Step 1: Write failing store tests**

Create Goal and Range Dial Properties and assert `getDialProperties('goal')` never returns Range entries. Assert mode is immutable during edit and property serialization retains the selected option snapshot.

- [ ] **Step 2: Verify failure**

Run: `npm run test -- src/stores/properties.test.ts`

Expected: FAIL because `dial` properties and getters are absent.

- [ ] **Step 3: Add transport and property contracts**

```ts
export type DialProgressMode = 'goal' | 'range'

export interface DialDataTypeOption extends DataTypeOption {
  dialMode: DialProgressMode
  dialMin: number | null
  dialMax: number | null
  dialGoalSource: 'garmin' | 'fixed' | null
}

export interface DialPropertyConfig {
  type: 'dial'
  title: string
  dialMode: DialProgressMode
  value: number | string
  options: DialDataTypeOption[]
}
```

Map the four API fields in `toDataTypeOption` without frontend defaults that invent Dial support.

- [ ] **Step 4: Add mode-filtered store access**

```ts
getDialProperties: (state) => (mode: DialProgressMode) =>
  Object.entries(state.properties).filter(([, property]) =>
    property.type === 'dial' && property.dialMode === mode
  )
```

Reject edits that change an existing Dial Property's `dialMode`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run test -- src/stores/properties.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit in wristo-studio**

```bash
git add src/api/data-type-options.ts src/config/elements/options/dataTypes.ts src/types/settings.ts src/types/properties.ts src/stores/properties.ts src/stores/properties.test.ts
git commit -m "add reusable dial properties"
```

### Task 4: Build Dial Property creation and editing UI

**Files:**
- Create: `src/components/properties/dialogs/DialPropertyDialog.vue`
- Create: `src/components/properties/dialogs/DialPropertyDialog.test.ts`
- Modify: `src/components/properties/PropertiesPanel.vue`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Write dialog component tests**

Assert Goal lists only `dialMode='goal'`, Range lists only Range, Range renders read-only `dialMin–dialMax`, edit mode disables Progress Mode, and confirm emits a `type:'dial'` payload with one selected option snapshot.

- [ ] **Step 2: Verify failure**

Run: `npm run test -- src/components/properties/dialogs/DialPropertyDialog.test.ts`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the focused dialog**

Use the existing Goal/Data dialogs for form lifecycle, but compute options with:

```ts
const compatibleOptions = computed(() =>
  DataTypeOptions.filter(option => option.dialMode === form.dialMode)
)
```

Do not duplicate Data/Goal property creation or allow mode edits after creation.

- [ ] **Step 4: Register Dial in PropertiesPanel**

Add `dial` to the property type order, open `DialPropertyDialog`, display its mode badge, and route create/edit confirmations through the existing property store path.

- [ ] **Step 5: Run focused tests**

Run: `npm run test -- src/components/properties/dialogs/DialPropertyDialog.test.ts src/stores/properties.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit in wristo-studio**

```bash
git add src/components/properties/dialogs/DialPropertyDialog.vue src/components/properties/dialogs/DialPropertyDialog.test.ts src/components/properties/PropertiesPanel.vue src/i18n.ts
git commit -m "add dial property editor"
```

### Task 5: Replace Sub-dial binding with mode-safe DialPropertyField

**Files:**
- Create: `src/elements/common/settings/DialPropertyField.vue`
- Create: `src/elements/common/settings/DialPropertyField.test.ts`
- Modify: `src/types/elements/subDial.ts`
- Modify: `src/elements/dials/subDial/subDial.schema.ts`
- Modify: `src/elements/dials/subDial/subDial.panel.vue`
- Modify: `src/elements/dials/subDial/subDial.panel.mount.test.ts`

- [ ] **Step 1: Write failing field and panel tests**

Assert a Goal field excludes Range properties, a Range field excludes Goal properties, the Add Property action opens Dial creation preselected to the current mode, and the panel exposes only `Goal | Range` with no custom bounds.

- [ ] **Step 2: Verify failure**

Run: `npm run test -- src/elements/common/settings/DialPropertyField.test.ts src/elements/dials/subDial/subDial.panel.mount.test.ts`

Expected: FAIL.

- [ ] **Step 3: Reduce the Sub-dial persisted contract**

```ts
export type SubDialProgressMode = 'goal' | 'range'

export interface SubDialElementConfig extends BaseElementConfig {
  eleType: 'subDial'
  progressMode: SubDialProgressMode
  dialProperty: string
  // visual fields remain unchanged
}
```

Remove new-write support for `progressProperty`, `goalProperty`, `customMin`, `customMax`, `rangeMode`, `minValue`, and `maxValue`.

- [ ] **Step 4: Implement DialPropertyField**

Accept `{ modelValue, mode }`, read `propertiesStore.getDialProperties(mode)`, emit only compatible keys, and emit the existing open-properties event with `{ type:'dial', dialMode: mode }`.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm run test -- src/elements/common/settings/DialPropertyField.test.ts src/elements/dials/subDial/subDial.panel.mount.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit in wristo-studio**

```bash
git add src/elements/common/settings/DialPropertyField.vue src/elements/common/settings/DialPropertyField.test.ts src/types/elements/subDial.ts src/elements/dials/subDial/subDial.schema.ts src/elements/dials/subDial/subDial.panel.vue src/elements/dials/subDial/subDial.panel.mount.test.ts
git commit -m "bind sub dials to typed dial properties"
```

### Task 6: Migrate, preview, encode and create Sub-dials

**Files:**
- Modify: `src/elements/dials/subDial/subDial.migration.ts`
- Modify: `src/elements/dials/subDial/subDial.migration.test.ts`
- Modify: `src/elements/dials/subDial/subDial.progress.ts`
- Modify: `src/elements/dials/subDial/subDial.progress.test.ts`
- Modify: `src/elements/dials/subDial/subDial.renderer.ts`
- Modify: `src/elements/dials/subDial/subDial.renderer.test.ts`
- Modify: `src/elements/dials/subDial/subDial.encoder.ts`
- Modify: `src/elements/dials/subDial/subDial.encoder.test.ts`
- Modify: `src/components/panels/AddElementPanel.vue`
- Modify: `src/components/layout/AppMenu.vue`

- [ ] **Step 1: Write migration and progress failures first**

Test Goal resolution from `value/goal`, Range from the selected option snapshot's bounds, no fallback, invalid data returning `valid:false`, and old `auto/custom` producing a `needsDialMigration` marker with no pointer value.

- [ ] **Step 2: Verify failures**

Run: `npm run test -- src/elements/dials/subDial/subDial.progress.test.ts src/elements/dials/subDial/subDial.migration.test.ts`

Expected: FAIL against the old four-mode model.

- [ ] **Step 3: Implement the two explicit resolvers**

```ts
if (mode === 'goal') {
  return finite(value) && finite(goal) && goal > 0
    ? valid(value / goal)
    : invalid()
}
return finite(value) && finite(min) && finite(max) && max > min
  ? valid((value - min) / (max - min))
  : invalid()
```

Resolve metadata only through `dialProperty`; never inspect arbitrary Data/Goal properties.

- [ ] **Step 4: Update creation and encoding**

Both AddElementPanel and AppMenu must ask for mode first, create/reuse a matching Dial Property, and assign `dialProperty`. Encoder writes only the new contract; decoder invokes legacy migration once.

- [ ] **Step 5: Run all Sub-dial tests**

Run: `npm run test -- src/elements/dials/subDial src/components/panels/AddElementPanel.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit in wristo-studio**

```bash
git add src/elements/dials/subDial src/components/panels/AddElementPanel.vue src/components/layout/AppMenu.vue
git commit -m "migrate sub dial progress model"
```

### Task 7: Resolve Dial Properties in scaffold export

**Files:**
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/fixtures/sub-dial-design.json`

- [ ] **Step 1: Add failing Goal and Range fixtures**

Include global `properties.dial_goal_1` and `dial_range_1`, then assert extraction outputs `metricSymbol`, `progressMode`, and Range bounds while rejecting mode mismatch or invalid bounds.

- [ ] **Step 2: Verify failure**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && /opt/homebrew/Cellar/jinja2-cli/0.8.2_3/libexec/bin/python -m unittest tests.test_sub_dial -v`

Expected: FAIL because extraction still expects progress/goal properties.

- [ ] **Step 3: Implement strict property resolution**

```python
def resolve_dial_property(element, properties):
    key = element.get("dialProperty")
    prop = properties.get(key)
    if not prop or prop.get("type") != "dial":
        raise ValueError(f"Missing Dial Property: {key}")
    mode = element.get("progressMode")
    if prop.get("dialMode") != mode:
        raise ValueError(f"Dial mode mismatch: {key}")
    return prop
```

Resolve the selected option snapshot; for Range validate and emit its bounds, and for Goal omit bounds.

- [ ] **Step 4: Run scaffold tests**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && /opt/homebrew/Cellar/jinja2-cli/0.8.2_3/libexec/bin/python -m unittest tests.test_sub_dial tests.test_sub_dial_template -v`

Expected: PASS.

- [ ] **Step 5: Commit in wristo-connectiq-app-build**

```bash
git -C ../wristo-connectiq-app-build add wristo-scaffold/super-extract-elements.py wristo-scaffold/tests/test_sub_dial.py wristo-scaffold/tests/fixtures/sub-dial-design.json
git -C ../wristo-connectiq-app-build commit -m "export typed dial properties"
```

### Task 8: Render explicit Goal and Range modes in Monkey C

**Files:**
- Modify: `../wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`
- Modify: `../wristo-apps/SuperBarrel/dials/SubDial.mc`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial_progress_runtime.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial_template.py`

- [ ] **Step 1: Add failing generated-code assertions**

Assert Goal checks `value != null`, `goal != null`, `goal > 0`; Range uses generated min/max; neither branch substitutes zero or falls back to the other mode.

- [ ] **Step 2: Verify failure**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && /opt/homebrew/Cellar/jinja2-cli/0.8.2_3/libexec/bin/python -m unittest tests.test_sub_dial_progress_runtime tests.test_sub_dial_template -v`

Expected: FAIL.

- [ ] **Step 3: Generate a nullable normalized value**

In the template, fetch once and branch at generation time. Goal produces `value / goal`; Range produces `(value-min)/(max-min)`. Pass normalized `0..1` or `null` to `SubDial.draw`; retain `clamp/hide` handling without multiplying and normalizing twice.

- [ ] **Step 4: Run scaffold runtime tests**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit each repository separately**

```bash
git -C ../wristo-apps/SuperAlpha add source/SuperAlphaView.j2.mc
git -C ../wristo-apps/SuperAlpha commit -m "render typed sub dial progress"
git -C ../wristo-apps/SuperBarrel add dials/SubDial.mc
git -C ../wristo-apps/SuperBarrel commit -m "normalize sub dial runtime input"
git -C ../wristo-connectiq-app-build add wristo-scaffold/tests/test_sub_dial_progress_runtime.py wristo-scaffold/tests/test_sub_dial_template.py
git -C ../wristo-connectiq-app-build commit -m "test typed sub dial runtime"
```

### Task 9: Add and enforce the Connect IQ Dial support manifest

**Files:**
- Create: `../wristo-apps/SuperBarrel/utils/dial-support.json`
- Create: `../wristo-apps/SuperBarrel/tests/test_dial_support.py`
- Modify: `../wristo-apps/SuperBarrel/utils/DataFetcher.mc`
- Modify: `../wristo-apps/SuperBarrel/utils/DataProvider.mc`

- [ ] **Step 1: Create a failing manifest-contract test**

The test must parse every manifest entry and assert `metricSymbol` occurs in DataFetcher, `providerMethod` exists in DataProvider, Goal entries declare `goalAvailable:true`, and Range entries declare finite ordered bounds matching backend seed values.

- [ ] **Step 2: Verify failure**

Run: `cd ../wristo-apps/SuperBarrel && python3 -m unittest tests.test_dial_support -v`

Expected: FAIL because the manifest is absent.

- [ ] **Step 3: Add the initial strict manifest**

```json
[
  {"metricSymbol":":GOAL_TYPE_STEPS","supportedDialMode":"goal","providerMethod":"getSteps","logicValueType":"number","goalAvailable":true},
  {"metricSymbol":":FIELD_TYPE_BATTERY","supportedDialMode":"range","providerMethod":"getBattery","logicValueType":"number","min":0,"max":100,"goalAvailable":false},
  {"metricSymbol":":FIELD_TYPE_BODY_BATTERY","supportedDialMode":"range","providerMethod":"getBodyBattery","logicValueType":"number","min":0,"max":100,"goalAvailable":false}
]
```

Add further entries only after verifying their current Provider returns a numeric logical value. Fix providers such as wind speed/direction before listing them; do not whitelist incomplete data.

- [ ] **Step 4: Run the manifest test**

Run the command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit in SuperBarrel**

```bash
git -C ../wristo-apps/SuperBarrel add utils/dial-support.json tests/test_dial_support.py utils/DataFetcher.mc utils/DataProvider.mc
git -C ../wristo-apps/SuperBarrel commit -m "declare connect iq dial support"
```

### Task 10: End-to-end verification

**Files:**
- Modify only if a verification defect is found; commit fixes in their owning repository.

- [ ] **Step 1: Run API tests**

Run: `cd ../wristo-api && mvn test`

Expected: BUILD SUCCESS.

- [ ] **Step 2: Run Studio tests and build**

Run: `npm run test -- src/elements/dials/subDial src/components/properties src/stores/properties.test.ts && npm run build`

Expected: tests PASS and Vite build succeeds.

- [ ] **Step 3: Run scaffold Sub-dial suite**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && /opt/homebrew/Cellar/jinja2-cli/0.8.2_3/libexec/bin/python -m unittest tests.test_sub_dial tests.test_sub_dial_template tests.test_sub_dial_progress_runtime -v`

Expected: PASS.

- [ ] **Step 4: Generate one Goal and one Range fixture app**

Verify the Goal output references `DATA_GOAL`, the Range output contains its fixed bounds, and neither contains `auto`, `customMin`, `customMax`, or legacy `goalProperty` bindings.

- [ ] **Step 5: Build generated fixtures with the installed Connect IQ SDK**

Run the repository's existing exact fixture/build command for the selected device and product. Expected: `BUILD SUCCESSFUL`; if the local SDK aborts before diagnostics, record the exact command and blocker without claiming device verification.

- [ ] **Step 6: Check repository cleanliness by scope**

Run: `git -C ../wristo-api diff --check && git diff --check && git -C ../wristo-connectiq-app-build diff --check && git -C ../wristo-apps/SuperAlpha diff --check && git -C ../wristo-apps/SuperBarrel diff --check`

Expected: no whitespace errors. Preserve unrelated pre-existing changes.
