# Online Bitmap Font Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Studio workflow that turns an uploaded TTF/OTF into all 39 Wristo BMFont sizes, validates the package on the API, stores it at the existing `font-bitmaps/<slug>/<slug>.zip` key, and creates a new submitted `DesignFont` with recipe-aware Studio preview.

**Architecture:** Studio owns font parsing, recipe editing, glyph rasterization, atlas packing, FNT writing, ZIP creation, preview, and progress reporting. The API treats every browser artifact as untrusted, validates the source font and complete ZIP contract, uploads through temporary object keys, then creates the `DesignFont` transactionally. A versioned `bitmapRecipe` travels through the database and `DesignFontVO`; Studio applies it only to Fabric preview while Connect IQ consumes the already baked BMFont assets.

**Tech Stack:** Vue 3, TypeScript, Pinia, Fabric 6, opentype.js, Canvas/OffscreenCanvas, Web Workers, JSZip, Vitest; Spring Boot, Java 21, Maven, MyBatis, FontBox, ImageIO, S3-compatible storage, JUnit 5.

---

## File map

### `wristo-studio`

- Create `src/features/bitmap-font-maker/contracts.ts`: recipe, manifest, charset and size constants.
- Create `src/features/bitmap-font-maker/fontSource.ts`: TTF/OTF parsing and required-glyph checks.
- Create `src/features/bitmap-font-maker/glyphRenderer.ts`: glyph rasterization and metrics.
- Create `src/features/bitmap-font-maker/atlasPacker.ts`: deterministic single-page rectangle packing.
- Create `src/features/bitmap-font-maker/bmFontWriter.ts`: AngelCode Text serializer/parser-facing model.
- Create `src/features/bitmap-font-maker/packageBuilder.ts`: 39-size orchestration, hashes, ZIP and manifest.
- Create `src/features/bitmap-font-maker/bitmapFont.worker.ts`: worker message protocol and cancellation.
- Create `src/features/bitmap-font-maker/workerClient.ts`: typed main-thread worker facade.
- Create `src/features/bitmap-font-maker/recipePreview.ts`: recipe-to-Fabric preview mapping.
- Create `src/features/bitmap-font-maker/*.test.ts`: focused unit and contract tests.
- Create `src/views/fonts/bitmap-maker/BitmapFontMaker.vue`: single-page workbench.
- Create `src/api/wristo/bitmapFontBuild.ts`: publish multipart request.
- Modify `src/router/index.ts`: authenticated `/fonts/bitmap-maker` route.
- Modify `src/views/fonts/Fonts.vue`: maker entry action.
- Modify `src/types/font.ts`: expose `BitmapFontRecipe` and `bitmapRecipe`.
- Modify `src/stores/fontStore.ts`: retain recipe metadata and refresh matching Fabric objects.
- Modify `src/composables/useGarminSystemFont.ts`: merge recipe preview props into the shared preview contract.
- Modify text renderers that do not use the shared resolver: angled, radial, scrollable and indicator text.
- Modify `src/i18n.ts`: English end-user copy for the maker.

### `wristo-api`

- Create `src/main/resources/db/migration/V70__add_design_font_bitmap_recipe.sql`.
- Modify `DesignFont.java`, `DesignFontVO.java`, `DesignFontCreateDTO.java`, `DesignFontConverter.java`, `DesignFontMapper.xml`.
- Create `dto/BitmapFontPublishMetadata.java`, `dto/BitmapFontRecipeDTO.java`, `dto/BitmapFontManifestDTO.java`.
- Create `controller/dsn/BitmapFontPublishController.java`.
- Create `service/BitmapFontPackageValidator.java` and `service/impl/BitmapFontPackageValidatorImpl.java`.
- Create `service/BitmapFontPublishService.java` and `service/impl/BitmapFontPublishServiceImpl.java`.
- Create `service/BitmapFontPackageStorageService.java` and its implementation.
- Create `support/BmFontTextParser.java`, `support/BitmapFontPackageHash.java`, `support/SafeZipReader.java`.
- Modify `DesignFontMapper.java` with a global active-slug lookup.
- Modify `storage/service/S3Service.java` and `storage/service/impl/S3ServiceImpl.java` with server-side object copy.
- Add focused JUnit tests mirroring every new service/support class.

### `wristo-resources`

- Modify `pipelines/fonts/download-font-from-s3.py` tests only if the new ZIP fixture reveals a contract mismatch; the production extraction path and S3 key remain unchanged.
- Create `pipelines/fonts/tests/test_online_bitmap_package_contract.py` using a checked-in minimal fixture or an in-test ZIP.

## Task 1: Freeze shared Studio generation contracts

**Files:**
- Create: `wristo-studio/src/features/bitmap-font-maker/contracts.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/contracts.test.ts`
- Modify: `wristo-studio/src/types/font.ts`

- [ ] **Step 1: Write the failing constants and validation tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  BITMAP_FONT_SIZES,
  charsetForType,
  normalizeBitmapFontRecipe,
} from './contracts'

describe('bitmap font contracts', () => {
  it('keeps the exact 39-size Wristo contract', () => {
    expect(BITMAP_FONT_SIZES).toHaveLength(39)
    expect(BITMAP_FONT_SIZES).toEqual([
      6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54,
      60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204,
      216, 228, 240, 264, 288, 312,
    ])
  })

  it('maps only supported v1 font types', () => {
    expect(charsetForType('number_font').codepoints).toEqual([
      ...Array.from({ length: 11 }, (_, index) => 48 + index), 176,
    ])
    expect(charsetForType('text_font').profile).toBe('wristo-text-en-v1')
    expect(() => charsetForType('icon_font')).toThrow('Unsupported bitmap font type')
  })

  it('normalizes a bounded recipe', () => {
    expect(normalizeBitmapFontRecipe({
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 1200,
      italicAngle: -40,
      outlineWidthEm: -1,
      outlineMode: 'fill',
    })).toMatchObject({ fontWeight: 900, italicAngle: -20, outlineWidthEm: 0 })
  })
})
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/contracts.test.ts`

Expected: FAIL because `./contracts` does not exist.

- [ ] **Step 3: Implement immutable contracts and public types**

```ts
export const BITMAP_FONT_SIZES = Object.freeze([
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54,
  60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204,
  216, 228, 240, 264, 288, 312,
] as const)

export type BitmapFontType = 'number_font' | 'text_font'
export type OutlineMode = 'fill' | 'fill-outline' | 'outline-only'

export interface BitmapFontRecipe {
  schemaVersion: 1
  rendererVersion: '1'
  fontWeight: number
  italicAngle: number
  outlineWidthEm: number
  outlineMode: OutlineMode
  lineJoin: 'round'
  antialias: true
}

export interface BitmapFontManifest {
  schemaVersion: 1
  slug: string
  type: BitmapFontType
  language: 'en'
  source: { fileName: string; sha256: string }
  sizes: number[]
  charset: { profile: string; codepoints: number[] }
  recipeSha256: string
  packageContentSha256: string
}
```

Add `bitmapRecipe?: BitmapFontRecipe | null` to `DesignFontVO` in `src/types/font.ts`. Implement `charsetForType()` with `48-58,176` for number and `32-126,176,8208,8211,8217,8230` for text. Implement numeric clamping in `normalizeBitmapFontRecipe()`.

- [ ] **Step 4: Run tests and typecheck**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/contracts.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/bitmap-font-maker/contracts.ts src/features/bitmap-font-maker/contracts.test.ts src/types/font.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "define bitmap font maker contracts"
```

## Task 2: Parse uploaded fonts and reject missing glyphs

**Files:**
- Create: `wristo-studio/src/features/bitmap-font-maker/fontSource.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/fontSource.test.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/__fixtures__/minimal-latin.ttf`

- [ ] **Step 1: Add a licensed minimal test font fixture and failing tests**

Use an OFL or public-domain subset fixture containing ASCII, degree, U+2010, U+2013, U+2019 and U+2026. Record its license in a neighboring `LICENSE.txt` if attribution is required.

```ts
it('extracts source metadata and coverage', async () => {
  const source = await parseFontSource(fixtureFile('minimal-latin.ttf'))
  expect(source.family).toBeTruthy()
  expect(source.supportedCodepoints.has(58)).toBe(true)
})

it('reports required glyphs without browser fallback', async () => {
  const source = await parseFontSource(fixtureFile('minimal-latin.ttf'))
  const result = checkRequiredGlyphs(source, { profile: 'test', codepoints: [65, 0x4e2d] })
  expect(result.missing).toEqual([0x4e2d])
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/fontSource.test.ts`

Expected: FAIL because parser functions do not exist.

- [ ] **Step 3: Implement parsing with opentype.js**

Parse `await file.arrayBuffer()` with `opentype.parse()`. Return a `ParsedFontSource` containing the original bytes, names, unitsPerEm, ascender, descender, glyph count, source weight/italic flags and a `Set<number>` built from the cmap/glyph Unicode values. Never use `document.fonts.check()` for coverage.

Reject files larger than 20 MB and extensions other than TTF/OTF before parsing. Normalize parser exceptions to `FONT_SOURCE_INVALID`.

- [ ] **Step 4: Run focused tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/fontSource.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/bitmap-font-maker/fontSource.ts src/features/bitmap-font-maker/fontSource.test.ts src/features/bitmap-font-maker/__fixtures__
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "parse bitmap font source files"
```

## Task 3: Render glyphs, pack one atlas and write FNT

**Files:**
- Create: `wristo-studio/src/features/bitmap-font-maker/glyphRenderer.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/atlasPacker.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/bmFontWriter.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/glyphRenderer.test.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/atlasPacker.test.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/bmFontWriter.test.ts`

- [ ] **Step 1: Write failing metric, packing and serialization tests**

Test these invariants with the fixed fixture: non-space glyphs have non-empty Alpha; space keeps positive `xadvance`; outline increases bounds; italic changes horizontal bounds; packed rectangles do not overlap; atlas never exceeds 8192; `.fnt` declares `unicode=1`, `pages=1`, the exact page filename and each required codepoint.

```ts
expect(rectanglesOverlap(a, b)).toBe(false)
expect(fnt).toContain('page id=0 file="demo-g_0.png"')
expect(fnt).toContain('char id=58')
```

- [ ] **Step 2: Run the three tests and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/glyphRenderer.test.ts src/features/bitmap-font-maker/atlasPacker.test.ts src/features/bitmap-font-maker/bmFontWriter.test.ts`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement deterministic glyph rendering**

Use the uploaded face only. In the worker, register the ArrayBuffer as `FontFace` when worker fonts are available; otherwise draw `opentype.js` glyph paths to `OffscreenCanvas`. Derive baseline from ascender/descender. Convert `outlineWidthEm * size` to pixels, use round joins, scan Alpha to crop, and compute offsets relative to the common baseline. A missing rendered glyph is an error, not fallback.

Implement the synthetic weight consistently in both paths: `fontWeight` selects the requested CSS weight when `FontFace` rendering supports it; the path renderer converts weight above the source weight to an additional round stroke. Record the chosen renderer path in diagnostics, but keep `rendererVersion='1'` output-compatible.

- [ ] **Step 4: Implement deterministic single-page packing**

Sort rectangles by descending max dimension, then codepoint. Try power-of-two and exact-fit candidate sizes up to 8192. Use one-pixel spacing plus computed glyph padding. Return `ATLAS_TOO_LARGE` rather than creating page 2.

- [ ] **Step 5: Implement AngelCode Text output**

Serialize `info`, `common`, one `page`, `chars`, sorted `char` records, and optional sorted `kernings`. Use `<slug>-g.fnt` and `<slug>-g_0.png`; escape quoted values. Keep the current Wristo sign convention for `info size` by asserting against an existing fixture such as `wristo-resources/fonts/bitmaps/wonderful/48/wonderful-g.fnt` in the cross-repo contract test.

- [ ] **Step 6: Run tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/glyphRenderer.test.ts src/features/bitmap-font-maker/atlasPacker.test.ts src/features/bitmap-font-maker/bmFontWriter.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/bitmap-font-maker
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "generate Garmin bitmap font atlases"
```

## Task 4: Build all sizes in a cancellable worker and create the ZIP

**Files:**
- Create: `wristo-studio/src/features/bitmap-font-maker/packageBuilder.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/bitmapFont.worker.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/workerClient.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/packageBuilder.test.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/workerClient.test.ts`

- [ ] **Step 1: Write failing package/hash/progress tests**

Assert exactly 81 ZIP entries: source, recipe, manifest, plus 39 pairs. Assert no outer slug directory. Assert `packageContentSha256` excludes `manifest.json` and hashes sorted `path + NUL + lowercaseSha256 + LF`. Assert a cancellation message prevents later size progress and rejects with `BUILD_CANCELLED`.

- [ ] **Step 2: Run and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/packageBuilder.test.ts src/features/bitmap-font-maker/workerClient.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement package building**

Build sizes in `BITMAP_FONT_SIZES` order. Add each completed FNT/PNG pair to JSZip, release its Canvas/ImageData, and emit `{ type:'progress', completed, total:39, size }`. Serialize canonical JSON with stable key order before hashing. Generate `recipe.json`, calculate all non-Manifest entry hashes, then add `manifest.json` last.

- [ ] **Step 4: Implement worker protocol**

```ts
type WorkerRequest =
  | { type: 'build'; requestId: string; source: ArrayBuffer; fileName: string; slug: string; fontType: BitmapFontType; recipe: BitmapFontRecipe }
  | { type: 'cancel'; requestId: string }

type WorkerResponse =
  | { type: 'progress'; requestId: string; size: number; completed: number; total: 39 }
  | { type: 'complete'; requestId: string; zip: ArrayBuffer; manifest: BitmapFontManifest }
  | { type: 'error'; requestId: string; code: string; message: string; details?: unknown }
```

Transfer ArrayBuffers instead of cloning them. Terminate the worker on view unmount. Do not fall back to synchronous 39-size generation if Worker/OffscreenCanvas is unavailable; return `BROWSER_UNSUPPORTED`.

- [ ] **Step 5: Run tests and a memory smoke test**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/packageBuilder.test.ts src/features/bitmap-font-maker/workerClient.test.ts`

Expected: PASS. The smoke test must build the fixture at all sizes without retaining 39 ImageData objects.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/bitmap-font-maker
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "build bitmap font packages in worker"
```

## Task 5: Add the Studio maker page and publish client

**Files:**
- Create: `wristo-studio/src/views/fonts/bitmap-maker/BitmapFontMaker.vue`
- Create: `wristo-studio/src/views/fonts/bitmap-maker/BitmapFontMaker.test.ts`
- Create: `wristo-studio/src/api/wristo/bitmapFontBuild.ts`
- Modify: `wristo-studio/src/router/index.ts`
- Modify: `wristo-studio/src/views/fonts/Fonts.vue`
- Modify: `wristo-studio/src/i18n.ts`

- [ ] **Step 1: Write failing component tests**

Mount with mocked worker and API. Verify upload metadata, type-dependent missing-glyph messages, recipe controls, current-size preview, stale-build invalidation, progress, cancel, ZIP download, disabled publish before validation, multipart publish, slug-conflict retry without rebuilding, and redirect to font details after success.

- [ ] **Step 2: Run and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/views/fonts/bitmap-maker/BitmapFontMaker.test.ts`

Expected: FAIL because the view does not exist.

- [ ] **Step 3: Add route and entry**

Add an authenticated child route:

```ts
{
  path: 'fonts/bitmap-maker',
  name: 'BitmapFontMaker',
  component: () => import('@/views/fonts/bitmap-maker/BitmapFontMaker.vue'),
  meta: { requiresAuth: true },
}
```

Add a `Create Bitmap Font` action in `Fonts.vue`; reuse `useStudioMembershipGate()` and block non-Premium users before navigation.

- [ ] **Step 4: Implement the single-page workbench**

Keep source file/bytes in memory only. Use separate computed states for `sourceValid`, `recipeValid`, `buildFresh`, `buildRunning`, `localValidationPassed`, and `publishing`. Only output-affecting changes invalidate the build; `fullName`, slug, style tags and keywords regenerate metadata/Manifest without rerasterizing.

The atlas pane renders the current generated preview Blob and overlays glyph rectangles. Device preview uses the same recipe renderer. Add English copy to `i18n.ts` because Studio end-user UI is English.

- [ ] **Step 5: Implement multipart publishing**

```ts
export async function publishBitmapFont(input: PublishBitmapFontInput) {
  const form = new FormData()
  form.append('sourceFont', input.sourceFile)
  form.append('package', new File([input.zip], `${input.slug}.zip`, { type: 'application/zip' }))
  form.append('manifest', new Blob([JSON.stringify(input.manifest)], { type: 'application/json' }))
  form.append('recipe', new Blob([JSON.stringify(input.recipe)], { type: 'application/json' }))
  form.append('metadata', new Blob([JSON.stringify(input.metadata)], { type: 'application/json' }))
  return instance.post('/dsn/fonts/bitmap-build/publish', form)
}
```

- [ ] **Step 6: Run focused tests and typecheck**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/views/fonts/bitmap-maker/BitmapFontMaker.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/views/fonts/bitmap-maker src/api/wristo/bitmapFontBuild.ts src/router/index.ts src/views/fonts/Fonts.vue src/i18n.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "add online bitmap font maker"
```

## Task 6: Persist bitmap recipes and enforce global slug uniqueness

**Files:**
- Create: `wristo-api/src/main/resources/db/migration/V70__add_design_font_bitmap_recipe.sql`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/entity/DesignFont.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/vo/DesignFontVO.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/dto/DesignFontCreateDTO.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/converter/DesignFontConverter.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/mapper/DesignFontMapper.java`
- Modify: `wristo-api/src/main/resources/mapper/DesignFontMapper.xml`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/design/converter/DesignFontConverterTest.java`

- [ ] **Step 1: Write failing converter and mapper contract tests**

Assert `bitmapRecipe` survives entity-to-VO conversion and mapper result mapping. Add a migration precondition test/query that fails with an actionable message if active rows contain duplicate slugs.

- [ ] **Step 2: Run focused API test**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=DesignFontConverterTest test`

Expected: FAIL because `bitmapRecipe` is absent.

- [ ] **Step 3: Add migration and model fields**

Migration contents:

```sql
ALTER TABLE design_fonts
  ADD COLUMN bitmap_recipe json NULL COMMENT 'Versioned bitmap rendering recipe' AFTER search_keywords;

-- Run a duplicate audit before replacing the existing key in production.
ALTER TABLE design_fonts DROP INDEX uk_design_fonts_slug;
ALTER TABLE design_fonts ADD UNIQUE KEY uk_design_fonts_slug_global (slug);
```

Do not deploy the index replacement until the duplicate audit returns zero rows:

```sql
SELECT slug, COUNT(*) FROM design_fonts WHERE is_deleted = 0 GROUP BY slug HAVING COUNT(*) > 1;
```

Map JSON as a string in Java (`String bitmapRecipe`) to avoid introducing a new MyBatis JSON type handler in v1. Validator code canonicalizes JSON before persistence.

- [ ] **Step 4: Update mapper columns, insert/update and converter**

Add `bitmap_recipe` to `Base_Column_List`, `resultMap`, insert, and update. Add `selectBySlugGlobal(String slug)` without user filtering.

- [ ] **Step 5: Run tests and migration validation**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=DesignFontConverterTest test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-api add src/main/resources/db/migration/V70__add_design_font_bitmap_recipe.sql src/main/java/com/wukong/face/modules/design src/main/resources/mapper/DesignFontMapper.xml src/test/java/com/wukong/face/modules/design/converter/DesignFontConverterTest.java
git -C /Users/mac/workspace/wristo/wristo-api commit -m "persist DesignFont bitmap recipes"
```

## Task 7: Implement safe ZIP, hash, FNT and PNG validation

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/support/SafeZipReader.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/support/BitmapFontPackageHash.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/support/BmFontTextParser.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/service/BitmapFontPackageValidator.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/service/impl/BitmapFontPackageValidatorImpl.java`
- Create: `wristo-api/src/test/java/com/wukong/face/modules/design/support/SafeZipReaderTest.java`
- Create: `wristo-api/src/test/java/com/wukong/face/modules/design/service/BitmapFontPackageValidatorImplTest.java`

- [ ] **Step 1: Write malicious and malformed package tests**

Programmatically build ZIPs for: `../escape`, absolute paths, more than 128 files, source over 20 MB, ZIP over 256 MB, extracted total over 1 GB, a 100:1 compression-ratio violation, unknown size folder, missing size, page count 2, wrong PNG filename, scale mismatch, glyph outside image bounds, overlap, duplicate codepoint, missing required codepoint, and hash mismatch.

- [ ] **Step 2: Run and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=SafeZipReaderTest,BitmapFontPackageValidatorImplTest test`

Expected: FAIL because validator classes do not exist.

- [ ] **Step 3: Implement bounded streaming ZIP reads**

Use `ZipInputStream` into a request-scoped temporary directory created with `Files.createTempDirectory()`. Normalize each path, reject absolute paths and any resolved path outside the temp root, reject duplicate entries, reject symbolic-link-like Unix mode entries when mode metadata is available, and enforce limits while streaming. Cleanup belongs to `AutoCloseable` package context and must run in `finally`/try-with-resources.

- [ ] **Step 4: Implement package hash exactly**

For all files except `manifest.json`, sort UTF-8 paths, calculate lowercase SHA-256 per content, append `path`, NUL, digest and LF as UTF-8, then SHA-256 the concatenation. Test with the same golden vector used by the Studio test.

- [ ] **Step 5: Implement FNT and PNG validation**

Parse only the required AngelCode Text keys into bounded DTOs. Use `ImageIO` to read PNG dimensions. Require one page, exact filenames, exact character set, unique glyph IDs, nonnegative rectangles within `scaleW/scaleH`, no rectangle overlaps, and max 8192. Compare source/recipe/package hashes and metadata fields with Manifest.

- [ ] **Step 6: Run tests**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=SafeZipReaderTest,BitmapFontPackageValidatorImplTest test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-api add src/main/java/com/wukong/face/modules/design/support src/main/java/com/wukong/face/modules/design/service src/test/java/com/wukong/face/modules/design/support src/test/java/com/wukong/face/modules/design/service
git -C /Users/mac/workspace/wristo/wristo-api commit -m "validate bitmap font packages"
```

## Task 8: Publish assets safely and create the submitted DesignFont

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/dto/BitmapFontPublishMetadata.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/dto/BitmapFontRecipeDTO.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/dto/BitmapFontManifestDTO.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/service/BitmapFontPackageStorageService.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/service/impl/BitmapFontPackageStorageServiceImpl.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/service/BitmapFontPublishService.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/service/impl/BitmapFontPublishServiceImpl.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/design/controller/dsn/BitmapFontPublishController.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/storage/service/S3Service.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/storage/service/impl/S3ServiceImpl.java`
- Create: `wristo-api/src/test/java/com/wukong/face/modules/design/service/BitmapFontPublishServiceImplTest.java`
- Create: `wristo-api/src/test/java/com/wukong/face/modules/design/controller/dsn/BitmapFontPublishControllerTest.java`
- Modify: `wristo-api/src/test/java/com/wukong/face/modules/storage/service/impl/S3ServiceImplTest.java`

- [ ] **Step 1: Write failing publish orchestration tests**

Assert authentication/Premium enforcement, supported types only, `language=en`, global slug conflict, server-owned user/status/system fields, source metadata extraction, temp-key upload before final key, final key `font-bitmaps/<slug>/<slug>.zip`, no DB row on upload failure, deletion on DB failure, and persisted `bitmapRecipe`.

- [ ] **Step 2: Run and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=BitmapFontPublishServiceImplTest,BitmapFontPublishControllerTest test`

Expected: FAIL.

- [ ] **Step 3: Add multipart controller**

```java
@PostMapping(value = "/bitmap-build/publish", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public Result<DesignFontVO> publish(
        @RequestPart("sourceFont") MultipartFile sourceFont,
        @RequestPart("package") MultipartFile packageFile,
        @RequestPart("manifest") BitmapFontManifestDTO manifest,
        @RequestPart("recipe") BitmapFontRecipeDTO recipe,
        @RequestPart("metadata") BitmapFontPublishMetadata metadata) {
    return Result.success(publishService.publish(sourceFont, packageFile, manifest, recipe, metadata));
}
```

Use existing authentication utilities and the same Premium entitlement rule used by Studio uploads. Return stable bitmap-font error codes/details; do not expose temp paths or S3 internals.

- [ ] **Step 4: Implement storage orchestration**

Add `S3Service.copyObject(String sourceKey, String targetKey)` and implement it with the storage provider's server-side copy API; test exact source/target bucket keys and propagated provider errors. Upload to request-scoped keys such as `font-bitmaps/.pending/<requestId>/<slug>.zip`, then promote to `font-bitmaps/<slug>/<slug>.zip` without downloading the ZIP into JVM memory. Track uploaded keys and delete them on failure.

- [ ] **Step 5: Create server-owned DesignFont metadata**

Parse source metadata with FontBox. Set `fullName` from allowed metadata; set family/copyright/version/width from source; derive weight/italic/subfamily from recipe; set glyph count from profile; generate `<source-postscript>-Wristo-<slug>` safely; set `bitmapRecipe` to canonical JSON; set user from auth, `isSystem=0`, `isActive=1`, `status=SUBMITTED`. Always create; never call existing overwrite-oriented `applyCreateOrUpdate()`.

- [ ] **Step 6: Run tests**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=BitmapFontPublishServiceImplTest,BitmapFontPublishControllerTest test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-api add src/main/java/com/wukong/face/modules/design src/main/java/com/wukong/face/modules/storage src/test/java/com/wukong/face/modules/design
git -C /Users/mac/workspace/wristo/wristo-api commit -m "publish generated bitmap fonts"
```

## Task 9: Apply bitmap recipes to Studio font cards and Fabric preview

**Files:**
- Create: `wristo-studio/src/features/bitmap-font-maker/recipePreview.ts`
- Create: `wristo-studio/src/features/bitmap-font-maker/recipePreview.test.ts`
- Modify: `wristo-studio/src/stores/fontStore.ts`
- Modify: `wristo-studio/src/composables/useGarminSystemFont.ts`
- Modify: `wristo-studio/src/components/font-picker/FontFamilyList.vue`
- Modify: `wristo-studio/src/elements/texts/angledText/angledText.renderer.ts`
- Modify: `wristo-studio/src/elements/texts/radialText/radialText.renderer.ts`
- Modify: `wristo-studio/src/elements/texts/scrollableText/scrollableText.renderer.ts`
- Modify: `wristo-studio/src/elements/indicators/common/indicatorText.renderer.ts`
- Test: `wristo-studio/src/stores/fontStore.metrics.test.ts`

- [ ] **Step 1: Write failing recipe mapping tests**

```ts
expect(recipeToFabricProps(recipe, 48, '#fff')).toMatchObject({
  fontWeight: 700,
  skewX: -12,
  strokeWidth: 1.92,
})
expect(recipeToFabricProps({ ...recipe, outlineMode: 'outline-only' }, 48, '#fff').fill)
  .toBe('rgba(0,0,0,0)')
```

Also assert a font with `bitmapRecipe=null` returns no additional props.

- [ ] **Step 2: Run and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/recipePreview.test.ts src/stores/fontStore.metrics.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement canonical recipe preview mapping**

Map `italicAngle` to Fabric `skewX`, `fontWeight` directly, and `outlineWidthEm * fontSize` to `strokeWidth`. For `fill-outline`, use the element fill for both fill and stroke. For `outline-only`, use transparent fill and the element's configured color as stroke. Keep this mapping preview-only; encoders must continue persisting the original element fill and font slug, not recipe-expanded Fabric fields.

- [ ] **Step 4: Merge recipes through the shared resolver**

Extend `resolveCurrentElementPreviewFont()` to obtain `fontStore.serverFonts.get(slug)?.bitmapRecipe` and return recipe props alongside family/size. Ensure `loadFont()` stores `DesignFontVO` before refreshing metrics. During refresh, reapply recipe props, call `initDimensions()`, `setCoords()`, mark dirty, and request render.

- [ ] **Step 5: Route remaining text renderers through the shared resolver**

Update angled, radial, scrollable and indicator text create/update functions to call the same resolver whenever font family, size or fill changes. Do not modify icon-font renderers because v1 rejects `icon_font` recipes.

- [ ] **Step 6: Apply recipe styling in font cards**

Use CSS style bindings for weight/italic and text-shadow/-webkit-text-stroke approximation for the picker card only. Label it as preview; do not use card CSS as the generator implementation.

- [ ] **Step 7: Run focused tests and typecheck**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker/recipePreview.test.ts src/stores/fontStore.metrics.test.ts src/components/font-picker/FontFamilyList.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/bitmap-font-maker/recipePreview.ts src/features/bitmap-font-maker/recipePreview.test.ts src/stores/fontStore.ts src/composables/useGarminSystemFont.ts src/components/font-picker/FontFamilyList.vue src/elements/texts src/elements/indicators/common
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "preview DesignFont bitmap recipes"
```

## Task 10: Lock the cross-repository package contract

**Files:**
- Create: `wristo-resources/pipelines/fonts/tests/test_online_bitmap_package_contract.py`
- Test fixture: generated at test time from a minimal ZIP entry list

- [ ] **Step 1: Write the failing extraction contract test**

Create a temporary `<slug>.zip` with root `manifest.json`, `recipe.json`, source font, and all size directories. Exercise the extraction helper into `fonts/bitmaps/<slug>` and assert `6/<slug>-g.fnt`, `48/<slug>-g_0.png`, and `312/<slug>-g.fnt` exist without a nested `<slug>/<slug>` directory.

- [ ] **Step 2: Run and inspect the result**

Run: `cd /Users/mac/workspace/wristo/wristo-resources && python -m unittest pipelines.fonts.tests.test_online_bitmap_package_contract -v`

Expected: PASS with current extraction behavior. A failure blocks implementation because it means the approved ZIP-root contract is incorrect; diagnose and revise the contract before changing production extraction code.

- [ ] **Step 3: Add current FNT sign/filename compatibility assertion**

Read one existing resource FNT and one generated fixture FNT; assert both use the same `info size` sign convention, one page, and `<slug>-g_0.png` naming.

- [ ] **Step 4: Run the font pipeline tests**

Run: `cd /Users/mac/workspace/wristo/wristo-resources && python -m unittest discover -s pipelines/fonts/tests -v`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mac/workspace/wristo/wristo-resources add pipelines/fonts/tests/test_online_bitmap_package_contract.py
git -C /Users/mac/workspace/wristo/wristo-resources commit -m "test online bitmap package contract"
```

## Task 11: End-to-end verification and release evidence

**Files:**
- Modify only when failures require fixes: files introduced above
- Do not add another design or plan document

- [ ] **Step 1: Run all focused Studio tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run test:unit -- src/features/bitmap-font-maker src/views/fonts/bitmap-maker src/stores/fontStore.metrics.test.ts src/components/font-picker/FontFamilyList.test.ts`

Expected: PASS.

- [ ] **Step 2: Run Studio static verification**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run typecheck && npm run build`

Expected: PASS. Record any known baseline failure separately; do not call the feature verified if its changed path fails.

- [ ] **Step 3: Run API focused and full tests**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest='*BitmapFont*Test,DesignFontConverterTest' test && mvn test`

Expected: focused tests PASS; full suite PASS or only documented pre-existing baseline failures.

- [ ] **Step 4: Run resource pipeline tests**

Run: `cd /Users/mac/workspace/wristo/wristo-resources && python -m unittest discover -s pipelines/fonts/tests -v`

Expected: PASS.

- [ ] **Step 5: Perform browser workflow verification**

Using a licensed test TTF/OTF, verify number and text profiles, normal/bold/italic/fill-outline/outline-only, progress/cancel/retry, ZIP download, publish and the new submitted font detail. Inspect small, medium and large previews at 6, 48 and 312.

- [ ] **Step 6: Verify the actual Connect IQ chain**

Approve the test font in a non-production environment, generate a project that references it, confirm `download-font-from-s3.py` extracts all 39 sizes, compile with the supported Connect IQ SDK, and inspect the Simulator at representative sizes. Record Studio preview, API publish, package extraction, compiler and Simulator as separate evidence.

- [ ] **Step 7: Final diff and security review**

Run `git diff --check` in all three repositories. Confirm no font licenses, personal fonts, secrets, source absolute paths, generated ZIPs, S3 credentials or temporary files are committed.

- [ ] **Step 8: Commit any verification-only fixes in their owning repository**

Use focused imperative commit messages and never combine Studio, API and resources changes into one repository commit.

## Plan self-review

- Spec coverage: source upload, two type profiles, 39 sizes, recipe styles, worker generation, one-page Atlas, ZIP/hash contract, untrusted backend validation, S3 key, new submitted DesignFont, recipe preview, cancellation, errors, security and cross-repo runtime verification are mapped to Tasks 1-11.
- Completeness scan: every code task names concrete behavior, files, commands and expected results. Security limits, hash input, filenames and routes are explicit.
- Type consistency: `BitmapFontRecipe`, `BitmapFontManifest`, `bitmapRecipe`, `fullName`, `number_font`, `text_font`, `language=en`, `packageContentSha256` and the publish multipart names are consistent throughout.
