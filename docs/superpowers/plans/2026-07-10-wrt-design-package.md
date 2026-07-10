# Wristo Studio `.wrt` Design Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export the current Studio design as a self-contained `.wrt` file and import it into the editor as a new, unsaved design.

**Architecture:** Keep the existing asset-bundle archive builder as the single source of asset collection and restoration. Extend it with a strict `wristo-design-package` manifest and file-based parsing API, then connect the editor menu to the existing Design view's loading pipeline through the event bus. The Design view owns all canvas mutation so a failed archive is rejected before the current design is cleared.

**Tech Stack:** Vue 3, TypeScript, Pinia, Element Plus, Fabric.js, JSZip.

---

## File structure

- Modify: `src/engine/services/designAssetBundleService.ts` — versioned `.wrt` archive creation, validation, file parsing, and complete asset URL restoration.
- Modify: `src/components/layout/app-menu/AppMenuActions.vue` — import/export action entries and callbacks.
- Modify: `src/components/layout/AppMenu.vue` — native file picker, download handling, and event emission.
- Modify: `src/views/Design.vue` — validated import application, clean unsaved state, and canvas/history reset.
- Modify: `src/i18n.ts` — action, success, and error labels in every shipped locale.

The repository has no unit-test runner configured (`package.json` exposes only TypeScript/build checks), so this plan verifies the interaction using deterministic archive validation and the production `npm run build` command instead of adding an unrelated test framework.

### Task 1: Add a strict, reusable `.wrt` archive API

**Files:**
- Modify: `src/engine/services/designAssetBundleService.ts:1-1120`

- [ ] **Step 1: Add format constants, public result types, and a typed import error.**

Place these declarations next to the existing manifest types so archive producers and consumers share the same contract:

```ts
const WRT_FORMAT = 'wristo-design-package'
const WRT_VERSION = 1

export class WrtDesignPackageError extends Error {
  constructor(public readonly code: 'invalid-file' | 'invalid-archive' | 'invalid-manifest' | 'unsupported-version' | 'invalid-design', message: string) {
    super(message)
    this.name = 'WrtDesignPackageError'
  }
}

export type ImportedWrtDesignPackage = {
  config: RuntimeDesignConfig
  sourceName: string
  failures: ManifestFailure[]
}
```

Extend `DesignAssetManifest` with `format?: string`; this keeps existing server-side asset bundles readable while making `.wrt` validation explicit.

- [ ] **Step 2: Refactor archive building into an internal builder and expose `.wrt` export.**

Keep `buildDesignAssetBundle()` behavior and its `-assets.zip` filename intact for Connect IQ/server uploads. Extract its body into a private function that accepts archive identity, then implement:

```ts
export async function buildWrtDesignPackage(
  config: RuntimeDesignConfig,
  options: BuildDesignAssetBundleOptions = {},
): Promise<File> {
  return buildDesignArchive(config, options, {
    fileName: `${slugifyDesignName(config.name, 'watchface')}.wrt`,
    mimeType: 'application/vnd.wristo.design-package+zip',
    manifestFormat: WRT_FORMAT,
    manifestVersion: WRT_VERSION,
  })
}
```

The shared builder must still include `design.json`, `config/config.json`, per-element JSON, referenced assets, fonts, weather/icons, preview, and manifest. Only `.wrt` receives `format: WRT_FORMAT` and `version: WRT_VERSION`; the existing asset ZIP retains its compatible manifest version/filename.

- [ ] **Step 3: Parse and validate a local `.wrt` without changing Pinia or the canvas.**

Add `readWrtDesignPackage(file)` before any restore function. It must check the extension, load JSZip, parse `manifest.json`, match `format`, match `version`, ensure `design.path` is a non-empty string, read and JSON-parse that entry, and require an `elements` array. Fail only with `WrtDesignPackageError`:

```ts
export async function readWrtDesignPackage(file: File): Promise<ImportedWrtDesignPackage> {
  if (!/\.wrt$/i.test(file.name)) {
    throw new WrtDesignPackageError('invalid-file', 'Please choose a .wrt design package.')
  }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new WrtDesignPackageError('invalid-archive', 'The .wrt file cannot be opened.')
  }
  const manifest = await parseManifest(zip)
  if (!manifest || manifest.format !== WRT_FORMAT || !manifest.design?.path) {
    throw new WrtDesignPackageError('invalid-manifest', 'This file is not a Wristo design package.')
  }
  if (manifest.version !== WRT_VERSION) {
    throw new WrtDesignPackageError('unsupported-version', 'This .wrt version is not supported by this Studio.')
  }
  const designFile = zip.file(manifest.design.path)
  if (!designFile) throw new WrtDesignPackageError('invalid-design', 'The design configuration is missing.')
  let config: RuntimeDesignConfig
  try {
    config = JSON.parse(await designFile.async('text')) as RuntimeDesignConfig
  } catch {
    throw new WrtDesignPackageError('invalid-design', 'The design configuration is invalid.')
  }
  if (!Array.isArray(config.elements)) {
    throw new WrtDesignPackageError('invalid-design', 'The design configuration has no element list.')
  }
  return { config: await restoreDesignAssetBundleFromZip(config, zip, manifest), sourceName: manifest.designName || config.name || 'Watch Face', failures: manifest.failures || [] }
}
```

- [ ] **Step 4: Make restoration accept an already-open ZIP and restore ordinary asset URLs.**

Extract the current body of `restoreDesignAssetBundle()` after ZIP loading into a private/public `restoreDesignAssetBundleFromZip(config, zip, manifest)` helper. Preserve weather and AMOLED icon restore behavior. Before returning, map every `manifest.studio.assetRefs` entry to an object URL and recursively replace matching `ASSET_URL_FIELDS` strings in `config.elements`; this makes image/SVG resources portable instead of depending on their original remote URLs.

```ts
const assetUrlBySource = new Map<string, string>()
for (const asset of manifest?.studio?.assetRefs || []) {
  const entry = zip.file(asset.path)
  if (!entry || !asset.sourceUrl) continue
  assetUrlBySource.set(asset.sourceUrl, URL.createObjectURL(await entry.async('blob')))
}
replaceElementAssetUrls(config.elements, assetUrlBySource)
```

`restoreDesignAssetBundle()` must continue fetching `assetBundleUrl`, loading JSZip, and delegate to the same helper, returning the original config only when no bundle URL exists.

- [ ] **Step 5: Type-check the archive service.**

Run: `npm run typecheck`

Expected: exit code `0`; no missing `format`, JSZip, or exported type errors.

- [ ] **Step 6: Commit the archive API.**

```bash
git add src/engine/services/designAssetBundleService.ts
git commit -m "feat: add wrt design package archive"
```

### Task 2: Add editor Actions for exporting and choosing `.wrt` files

**Files:**
- Modify: `src/components/layout/app-menu/AppMenuActions.vue:1-111`
- Modify: `src/components/layout/AppMenu.vue:1-720`

- [ ] **Step 1: Add explicit action props and menu entries.**

In `AppMenuActions.vue`, add two required callback props and place the menu items next to the existing asset-package export:

```vue
<el-menu-item index="actions/exportWrt" @click="onExportWrt">
  <el-icon><Download /></el-icon>
  <span>{{ t('editor.exportWrt') }}</span>
</el-menu-item>
<el-menu-item index="actions/importWrt" @click="onImportWrt">
  <el-icon><Upload /></el-icon>
  <span>{{ t('editor.importWrt') }}</span>
</el-menu-item>
```

Add `onExportWrt` and `onImportWrt` prop declarations and tiny forwarding functions following `onExportAssetPackage`; import no new icon because `Download` and `Upload` are already used.

- [ ] **Step 2: Generate/download `.wrt` from the current canvas.**

In `AppMenu.vue`, import `buildWrtDesignPackage`; add `handleExportWrt()` that deactivates selection, calls `baseStore.generateConfig({ validateBindings: false })`, captures an optional screenshot, builds the archive, downloads it with the existing `downloadBlob`, and reports a translated success/error message:

```ts
const handleExportWrt = async () => {
  baseStore.deactivateObject()
  const config = baseStore.generateConfig({ validateBindings: false })
  if (!config) throw new Error(t('editor.wrtExportFailed'))
  const previewDataUrl = await baseStore.captureScreenshot().catch(() => null)
  const file = await buildWrtDesignPackage(config, { previewDataUrl })
  downloadBlob(file, file.name)
  messageStore.success(t('editor.wrtExported'))
}
```

Wrap the call site in `try/catch` so failures display `editor.wrtExportFailed` and do not affect the open design.

- [ ] **Step 3: Pick a local file and emit it without parsing in the menu.**

Add a hidden file input after the dialogs:

```vue
<input ref="wrtFileInput" type="file" accept=".wrt,application/vnd.wristo.design-package+zip" class="sr-only" @change="handleWrtFileChange" />
```

Implement file selection so AppMenu only forwards a `File` to the Design view; reset the input value in `finally` to allow importing the same package twice:

```ts
const wrtFileInput = ref<HTMLInputElement | null>(null)
const handleImportWrt = () => wrtFileInput.value?.click()
const handleWrtFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emitter.emit('import-wrt-design', file)
  input.value = ''
}
```

Pass both handlers into `<AppMenuActions>` as `:on-export-wrt` and `:on-import-wrt`.

- [ ] **Step 4: Run type checks.**

Run: `npm run typecheck`

Expected: exit code `0`; the template ref and added callbacks are correctly typed.

- [ ] **Step 5: Commit the Actions UI.**

```bash
git add src/components/layout/app-menu/AppMenuActions.vue src/components/layout/AppMenu.vue
git commit -m "feat: add wrt import export actions"
```

### Task 3: Load a valid package as an unsaved design

**Files:**
- Modify: `src/views/Design.vue:80-690`

- [ ] **Step 1: Extract the shared configuration-to-canvas loader from `loadDesign`.**

Create `applyRuntimeDesignConfig(config: RuntimeDesignConfig)` next to `loadDesign`. Move the existing font loading, property defaulting/loading, `ensureBackgroundElement`, `loadElements`, display-state restore, layer-order restore, simulator update, and `historyStore.saveInitial()` into it. It must receive a fully restored config and never assign a persisted design ID.

- [ ] **Step 2: Clear only user-editable canvas content before applying the imported config.**

Add `clearEditableDesignCanvas()` that retains/remakes fixed `global` and `background` layers but removes all other Fabric objects, clears the element data store and active selection, resynchronizes element instances/layers, and waits for render:

```ts
const clearEditableDesignCanvas = async () => {
  const canvas = baseStore.canvas
  if (!canvas) return
  baseStore.deactivateObject()
  canvas.getObjects().filter((item: any) => !['global', 'background'].includes(item.eleType)).forEach((item: any) => canvas.remove(item))
  elementDataStore.clearAll()
  syncElementInstancesFromCanvas(canvas.getObjects() as any)
  syncLayersFromCanvas()
  canvas.requestRenderAll()
  await nextTick()
}
```

Import `syncElementInstancesFromCanvas` from `elementManager`. Do not call `canvas.clear()`, because it would remove Studio's required fixed layers.

- [ ] **Step 3: Implement the event handler with a validation-first transaction.**

Import `readWrtDesignPackage` and `WrtDesignPackageError`. Parse first, then mutate editor state only after parsing has succeeded:

```ts
const importWrtDesign = async (file: File) => {
  try {
    const imported = await readWrtDesignPackage(file)
    baseStore.setDesignLoading(true)
    await clearEditableDesignCanvas()
    baseStore.id = null
    designStore.id = null
    baseStore.appId = -1
    const copyName = `${imported.sourceName} Copy`
    baseStore.setWatchFaceName(copyName)
    designStore.setWatchFaceName(copyName)
    await router.replace({ path: route.path, query: {} })
    await applyRuntimeDesignConfig({ ...imported.config, designId: '', name: copyName })
    messageStore.success(t('editor.wrtImported'))
  } catch (error) {
    const key = error instanceof WrtDesignPackageError ? `editor.wrtImport.${error.code}` : 'editor.wrtImport.failed'
    messageStore.error(t(key))
  } finally {
    baseStore.setDesignLoading(false)
  }
}
```

Register the handler in `onMounted` using `emitter.on('import-wrt-design', importWrtDesign)` and unregister exactly that function in `onBeforeUnmount`.

- [ ] **Step 4: Preserve normal cloud-design loading.**

Update `loadDesign()` to keep the API lookup, server asset-bundle restore, persisted ID/name/app assignment, then call `applyRuntimeDesignConfig(restoredConfig)`. Confirm the no-ID redirect behavior remains only for initial routing; the import route stays on `/design` after `router.replace` and does not trigger a remount.

- [ ] **Step 5: Perform a manual round-trip acceptance check.**

Run: `npm run dev`

Expected: the editor opens locally. In the browser, create/use a design with an image and AMOLED icon, export `.wrt`, import it, and verify:

1. the imported canvas matches the source;
2. the title ends in `Copy`;
3. the URL has no `id`/`designId`/`from` query;
4. Save creates a new design rather than overwriting the source;
5. invalid extension and a renamed invalid ZIP display an error while leaving the current canvas unchanged.

- [ ] **Step 6: Commit the import loader.**

```bash
git add src/views/Design.vue
git commit -m "feat: load wrt packages as new designs"
```

### Task 4: Add localized feedback and verify the production build

**Files:**
- Modify: `src/i18n.ts:en, zh, zhTw, ja, ko, de, fr, es, it, pt, nl, pl message objects`

- [ ] **Step 1: Add the new message keys to every locale.**

Add these keys adjacent to `editor.exportAssetPackage` in every locale object, with fluent translations for that locale:

```ts
'editor.exportWrt': 'Export .wrt',
'editor.importWrt': 'Import .wrt',
'editor.wrtExported': '.wrt design package exported.',
'editor.wrtExportFailed': 'Unable to export the .wrt design package.',
'editor.wrtImported': 'Design package loaded as a new unsaved design.',
'editor.wrtImport.invalid-file': 'Please choose a .wrt design package.',
'editor.wrtImport.invalid-archive': 'The .wrt file cannot be opened.',
'editor.wrtImport.invalid-manifest': 'This file is not a Wristo design package.',
'editor.wrtImport.unsupported-version': 'This .wrt version is not supported by this Studio.',
'editor.wrtImport.invalid-design': 'The design configuration is missing or invalid.',
'editor.wrtImport.failed': 'Unable to import the .wrt design package.',
```

Use the existing English fallback only as safety; do not leave user-visible keys untranslated in the shipped Chinese locale.

- [ ] **Step 2: Run formatting checks without reformatting unrelated files.**

Run: `npx prettier --check src/engine/services/designAssetBundleService.ts src/components/layout/app-menu/AppMenuActions.vue src/components/layout/AppMenu.vue src/views/Design.vue src/i18n.ts`

Expected: exit code `0`. If formatting is needed, run Prettier only on the five listed files, inspect the diff, and repeat the check.

- [ ] **Step 3: Build the production Studio bundle.**

Run: `npm run build`

Expected: exit code `0`; Vue type checking and Vite production bundling both complete.

- [ ] **Step 4: Inspect the final diff and commit localization/verification changes.**

Run: `git diff --check`

Expected: no whitespace errors.

```bash
git add src/i18n.ts
git commit -m "feat: localize wrt package feedback"
```
