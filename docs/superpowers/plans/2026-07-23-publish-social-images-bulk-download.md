# Publish Social Images and Bulk Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show social images in the Studio publish dialog and let creators download every product and social image as one size-selectable ZIP.

**Architecture:** Keep `GoLiveDialog.vue` as the owner of the canonical `productImages` list and expose product/social computed groups to the existing editor. Add a focused, framework-independent archive service that resolves size variants, fetches files, creates the ZIP with JSZip, and reports partial failures; the dialog owns selection, loading, localization, and user feedback.

**Tech Stack:** Vue 3, TypeScript, Element Plus, JSZip, Vitest, Vue Test Utils

---

## File Map

- Create `src/components/common/productImageDownload.ts`: resolve image variants, fetch blobs, construct the ZIP, and trigger the single browser download.
- Create `src/components/common/productImageDownload.test.ts`: unit coverage for size fallback, deduplication, paths, and failure behavior.
- Create `src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts`: component coverage for product/social grouping, shared count, selector invocation, and feedback.
- Modify `src/components/dialogs/GoLiveDialog.vue`: render the social group and wire the bulk-download UI.
- Modify `src/i18n.ts`: add English and Chinese UI and feedback strings.

### Task 1: Implement the image archive service

**Files:**
- Create: `src/components/common/productImageDownload.ts`
- Test: `src/components/common/productImageDownload.test.ts`

- [ ] **Step 1: Write failing variant-planning tests**

Create `src/components/common/productImageDownload.test.ts` with tests that prove thumbnail fallback, original fallback, social normalization, arbitrary backend formats, and URL deduplication:

```ts
import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import {
  buildProductImageArchive,
  createProductImageDownloadEntries,
} from './productImageDownload'
import type { ProductImageItem } from '@/types/product'

const item = (overrides: Partial<ProductImageItem> = {}): ProductImageItem => ({
  id: 101,
  type: 'product',
  imageUrl: 'https://cdn/display.jpg',
  previewUrl: 'https://cdn/preview.jpg',
  downloadUrl: 'https://cdn/original.jpg',
  image: {
    id: 101,
    url: 'https://cdn/original.jpg',
    previewUrl: 'https://cdn/image-preview.jpg',
    formats: {
      thumbnail: { url: 'https://cdn/thumb.jpg', mime: 'image/jpeg' },
      medium: { url: 'https://cdn/medium.webp', mime: 'image/webp' },
    },
  },
  ...overrides,
})

describe('createProductImageDownloadEntries', () => {
  it('uses the declared thumbnail and normalizes share into the social folder', () => {
    const entries = createProductImageDownloadEntries(
      [item({ type: 'share' })],
      'thumbnail',
    )
    expect(entries).toEqual([
      expect.objectContaining({
        url: 'https://cdn/thumb.jpg',
        path: 'social/01-101-thumbnail.jpg',
      }),
    ])
  })

  it('uses downloadUrl for original mode', () => {
    expect(createProductImageDownloadEntries([item()], 'original')[0]).toEqual(
      expect.objectContaining({
        url: 'https://cdn/original.jpg',
        path: 'product/01-101-original.jpg',
      }),
    )
  })

  it('includes every distinct backend size in all-sizes mode', () => {
    const entries = createProductImageDownloadEntries([item()], 'all')
    expect(entries.map((entry) => entry.path)).toEqual([
      'product/01-101/original.jpg',
      'product/01-101/thumbnail.jpg',
      'product/01-101/medium.webp',
    ])
  })

  it('deduplicates format URLs within one image', () => {
    const image = item()
    image.image!.formats!.small = { url: 'https://cdn/thumb.jpg' }
    expect(createProductImageDownloadEntries([image], 'all')).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run the planning tests and verify they fail**

Run:

```bash
npx vitest run src/components/common/productImageDownload.test.ts
```

Expected: FAIL because `productImageDownload.ts` does not exist.

- [ ] **Step 3: Implement entry resolution**

Create `src/components/common/productImageDownload.ts` with these public types and functions:

```ts
import JSZip from 'jszip'
import type { ImageFormatSize } from '@/types/api/image'
import type { ProductImageItem } from '@/types/product'

export type ProductImageDownloadMode = 'thumbnail' | 'original' | 'all'

export interface ProductImageDownloadEntry {
  url: string
  path: string
}

export interface ProductImageArchiveResult {
  blob: Blob | null
  downloaded: number
  failed: number
}

const extensionFrom = (url: string, mime = ''): string => {
  const pathname = new URL(url, 'http://localhost').pathname
  const extension = pathname.match(/\.([a-z0-9]+)$/i)?.[1]
  if (extension) return extension.toLowerCase()
  return mime.split('/')[1]?.replace('jpeg', 'jpg') || 'bin'
}

const normalizedFolder = (item: ProductImageItem): 'product' | 'social' =>
  item.type === 'product' ? 'product' : 'social'

const originalSource = (item: ProductImageItem): ImageFormatSize | null => {
  const url = item.downloadUrl || item.image?.url || item.imageUrl
  return url ? { url, mime: item.image?.mime } : null
}

const thumbnailSource = (item: ProductImageItem): ImageFormatSize | null => {
  const format = item.image?.formats?.thumbnail
  if (format?.url) return format
  const url = item.previewUrl || item.image?.previewUrl || item.imageUrl
  return url ? { url } : null
}

export const createProductImageDownloadEntries = (
  items: ProductImageItem[],
  mode: ProductImageDownloadMode,
): ProductImageDownloadEntry[] => {
  return items.flatMap((item, index) => {
    const folder = normalizedFolder(item)
    const prefix = `${String(index + 1).padStart(2, '0')}-${item.id}`
    const sources: Array<[string, ImageFormatSize]> = []

    if (mode === 'thumbnail') {
      const source = thumbnailSource(item)
      if (source) sources.push(['thumbnail', source])
    } else {
      const source = originalSource(item)
      if (source) sources.push(['original', source])
      if (mode === 'all') {
        for (const [name, value] of Object.entries(item.image?.formats || {})) {
          if (value?.url) sources.push([name, value])
        }
      }
    }

    const seen = new Set<string>()
    return sources.flatMap(([name, source]) => {
      if (seen.has(source.url)) return []
      seen.add(source.url)
      const extension = extensionFrom(source.url, source.mime)
      const base = mode === 'all' ? `${folder}/${prefix}` : folder
      return [{ url: source.url, path: `${base}/${prefix}-${name}.${extension}`
        .replace(`${prefix}/${prefix}-`, `${prefix}/`) }]
    })
  })
}
```

- [ ] **Step 4: Run the entry-planning tests**

Run:

```bash
npx vitest run src/components/common/productImageDownload.test.ts
```

Expected: the four entry tests PASS.

- [ ] **Step 5: Add failing archive success and failure tests**

Append tests using a mocked `fetch`:

```ts
describe('buildProductImageArchive', () => {
  it('keeps successful files when another image fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(new Blob(['ok'], { type: 'image/jpeg' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 404 })))

    const result = await buildProductImageArchive(
      [item(), item({ id: 102, type: 'social', downloadUrl: 'https://cdn/missing.jpg' })],
      'original',
    )

    expect(result).toMatchObject({ downloaded: 1, failed: 1 })
    expect(result.blob).toBeInstanceOf(Blob)
    const zip = await JSZip.loadAsync(result.blob!)
    expect(Object.keys(zip.files)).toContain('product/01-101-original.jpg')
    vi.unstubAllGlobals()
  })

  it('does not create an empty archive when every fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(buildProductImageArchive([item()], 'original')).resolves.toEqual({
      blob: null,
      downloaded: 0,
      failed: 1,
    })
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 6: Implement archive construction and browser saving**

Add:

```ts
export const buildProductImageArchive = async (
  items: ProductImageItem[],
  mode: ProductImageDownloadMode,
): Promise<ProductImageArchiveResult> => {
  const zip = new JSZip()
  const entries = createProductImageDownloadEntries(items, mode)
  let downloaded = 0
  let failed = items.filter(
    (item) => createProductImageDownloadEntries([item], mode).length === 0,
  ).length

  for (const entry of entries) {
    try {
      const response = await fetch(entry.url)
      if (!response.ok) throw new Error(String(response.status))
      zip.file(entry.path, await response.arrayBuffer())
      downloaded += 1
    } catch {
      failed += 1
    }
  }

  return {
    blob: downloaded > 0 ? await zip.generateAsync({ type: 'blob' }) : null,
    downloaded,
    failed,
  }
}

export const saveProductImageArchive = (blob: Blob, appId: number): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${appId}-product-images.zip`
  anchor.click()
  URL.revokeObjectURL(url)
}
```

`failed` is file-based: every failed fetch counts once, and an image with no
usable URL for the selected mode contributes one failure.

- [ ] **Step 7: Run service tests and commit**

Run:

```bash
npx vitest run src/components/common/productImageDownload.test.ts
```

Expected: all tests PASS.

Commit:

```bash
git add src/components/common/productImageDownload.ts src/components/common/productImageDownload.test.ts
git commit -m "add product image archive service"
```

### Task 2: Display social images with the shared limit

**Files:**
- Modify: `src/components/dialogs/GoLiveDialog.vue`
- Create: `src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts`

- [ ] **Step 1: Write a failing component grouping test**

Create a behavior test using the same API/store/Element Plus stubs as
`GoLiveDialog.productTags.behavior.test.ts`. Give the design three images:

```ts
productImages: [
  { id: 1, type: 'product', imageUrl: '/product.png' },
  { id: 2, type: 'social', imageUrl: '/social.png' },
  { id: 3, type: 'share', imageUrl: '/share.png' },
],
```

Use a named editor stub:

```ts
const ProductImagesEditorStub = defineComponent({
  name: 'ProductImagesEditor',
  props: {
    modelValue: { type: Array, required: true },
    imageType: { type: String, required: true },
    totalCount: { type: Number, required: true },
    maxTotal: { type: Number, required: true },
  },
  emits: ['update:modelValue'],
  template: '<div class="product-images-editor" :data-type="imageType" />',
})
```

Assert:

```ts
const editors = wrapper.findAllComponents(ProductImagesEditorStub)
expect(editors).toHaveLength(2)
expect(editors[0].props('imageType')).toBe('product')
expect(editors[0].props('modelValue')).toHaveLength(1)
expect(editors[1].props('imageType')).toBe('social')
expect(editors[1].props('modelValue')).toHaveLength(2)
expect(editors.map((editor) => editor.props('totalCount'))).toEqual([3, 3])
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
npx vitest run src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts
```

Expected: FAIL because only one editor is rendered.

- [ ] **Step 3: Add the social computed model and editor**

In `GoLiveDialog.vue`, add:

```ts
const socialImageItems = computed({
  get: () => groupProductImages(form.productImages).social,
  set: (items: ProductImageItem[]) => {
    form.productImages = replaceProductImageGroup(form.productImages, 'social', items)
  },
})
```

Render a second form item after Product Images:

```vue
<el-form-item :label="t('goLive.socialImages')">
  <div class="product-image-section">
    <ProductImagesEditor
      v-model="socialImageItems"
      image-type="social"
      :total-count="form.productImages.length"
      :max-total="PRODUCT_IMAGE_LIMIT"
    />
    <div class="form-tip">
      {{ t('goLive.productImagesUsed', { count: form.productImages.length, max: PRODUCT_IMAGE_LIMIT }) }}
    </div>
  </div>
</el-form-item>
```

- [ ] **Step 4: Run the grouping test and existing model tests**

Run:

```bash
npx vitest run \
  src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts \
  src/components/common/productImageModel.test.ts
```

Expected: all tests PASS, including historical `share` normalization.

- [ ] **Step 5: Commit the social display**

```bash
git add src/components/dialogs/GoLiveDialog.vue src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts
git commit -m "show social images when publishing"
```

### Task 3: Wire the bulk-download selector and feedback

**Files:**
- Modify: `src/components/dialogs/GoLiveDialog.vue`
- Modify: `src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add failing download-interaction tests**

Mock the archive service:

```ts
const mocks = vi.hoisted(() => ({
  buildProductImageArchive: vi.fn(),
  saveProductImageArchive: vi.fn(),
}))

vi.mock('@/components/common/productImageDownload', () => ({
  buildProductImageArchive: mocks.buildProductImageArchive,
  saveProductImageArchive: mocks.saveProductImageArchive,
}))
```

Stub `ElDropdown`, `ElDropdownMenu`, and `ElDropdownItem` so a menu item emits
`command="all"`. Assert that clicking All sizes:

```ts
mocks.buildProductImageArchive.mockResolvedValue({
  blob: new Blob(['zip']),
  downloaded: 6,
  failed: 1,
})

await wrapper.get('[data-download-mode="all"]').trigger('click')
await flushPromises()

expect(mocks.buildProductImageArchive).toHaveBeenCalledWith(
  expect.arrayContaining([
    expect.objectContaining({ type: 'product' }),
    expect.objectContaining({ type: 'social' }),
    expect.objectContaining({ type: 'share' }),
  ]),
  'all',
)
expect(mocks.saveProductImageArchive).toHaveBeenCalledWith(expect.any(Blob), 200)
expect(mocks.messageWarning).toHaveBeenCalledWith('goLive.imageDownloadPartial')
```

Add separate assertions that an all-failed result does not call the save
function and empty image data disables the action.

- [ ] **Step 2: Run the interaction test and verify it fails**

Run:

```bash
npx vitest run src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts
```

Expected: FAIL because the download controls and handler do not exist.

- [ ] **Step 3: Add the selector and handler**

Import:

```ts
import { Download } from '@element-plus/icons-vue'
import {
  buildProductImageArchive,
  saveProductImageArchive,
  type ProductImageDownloadMode,
} from '@/components/common/productImageDownload'
```

Add state and behavior:

```ts
const downloadingImages = ref(false)

const downloadAllProductImages = async (mode: ProductImageDownloadMode) => {
  if (form.productImages.length === 0 || downloadingImages.value) return
  downloadingImages.value = true
  try {
    const result = await buildProductImageArchive(form.productImages, mode)
    if (!result.blob) {
      messageStore.error(t('goLive.imageDownloadFailed'))
      return
    }
    saveProductImageArchive(result.blob, form.appId)
    if (result.failed > 0) {
      messageStore.warning(t('goLive.imageDownloadPartial', { count: result.failed }))
    } else {
      messageStore.success(t('goLive.imageDownloadSuccess'))
    }
  } catch (error) {
    console.error('Failed to download product images:', error)
    messageStore.error(t('goLive.imageDownloadFailed'))
  } finally {
    downloadingImages.value = false
  }
}
```

Place one dropdown above the two image editors:

```vue
<div class="product-image-download-row">
  <el-dropdown
    trigger="click"
    :disabled="form.productImages.length === 0 || downloadingImages"
    @command="downloadAllProductImages"
  >
    <el-button :icon="Download" :loading="downloadingImages">
      {{ t('goLive.downloadAllImages') }}
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="thumbnail" data-download-mode="thumbnail">
          {{ t('goLive.downloadThumbnail') }}
        </el-dropdown-item>
        <el-dropdown-item command="original" data-download-mode="original">
          {{ t('goLive.downloadOriginal') }}
        </el-dropdown-item>
        <el-dropdown-item command="all" data-download-mode="all">
          {{ t('goLive.downloadAllSizes') }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</div>
```

Use a small flex row aligned to the end of the image section; do not change the
existing editor card dimensions or publish form layout.

- [ ] **Step 4: Add English and Chinese localization**

Add these keys beside the existing `goLive.productImages` strings:

```ts
'goLive.socialImages': 'Social Images',
'goLive.downloadAllImages': 'Download all images',
'goLive.downloadThumbnail': 'Thumbnail',
'goLive.downloadOriginal': 'Original',
'goLive.downloadAllSizes': 'All sizes',
'goLive.imageDownloadSuccess': 'Image archive downloaded',
'goLive.imageDownloadPartial': '{count} image files could not be downloaded',
'goLive.imageDownloadFailed': 'Unable to download the images',
```

```ts
'goLive.socialImages': 'Social 图片',
'goLive.downloadAllImages': '下载全部图片',
'goLive.downloadThumbnail': '缩略图',
'goLive.downloadOriginal': '原图',
'goLive.downloadAllSizes': '所有尺寸',
'goLive.imageDownloadSuccess': '图片压缩包已下载',
'goLive.imageDownloadPartial': '有 {count} 个图片文件下载失败',
'goLive.imageDownloadFailed': '图片下载失败',
```

- [ ] **Step 5: Run focused UI and service tests**

Run:

```bash
npx vitest run \
  src/components/common/productImageDownload.test.ts \
  src/components/common/productImageModel.test.ts \
  src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts \
  src/components/dialogs/GoLiveDialog.productTags.behavior.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 6: Commit the download UI**

```bash
git add src/components/dialogs/GoLiveDialog.vue \
  src/components/dialogs/GoLiveDialog.productImages.behavior.test.ts \
  src/i18n.ts
git commit -m "add bulk product image downloads"
```

### Task 4: Verify the complete feature

**Files:**
- Verify only; fix only files already listed if verification exposes a feature defect.

- [ ] **Step 1: Run the complete unit suite**

Run:

```bash
npm run test:unit
```

Expected: Vitest exits with status 0.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: `vue-tsc --noEmit` and the Vite production build both exit with
status 0.

- [ ] **Step 3: Perform a manual publish-dialog check**

Open a product containing both `product` and `social` image records and verify:

- Product and Social sections contain the correct records.
- Both sections show the same combined count and enforce the shared limit.
- Thumbnail mode produces one ZIP containing `product/` and `social/`.
- Original mode uses full-resolution URLs.
- All sizes contains only the variants returned by the API.
- Removing or uploading an image in one section preserves the other section.
- Publishing still sends one `productImages` array with `social` types
  normalized.

- [ ] **Step 4: Record final repository state**

Run:

```bash
git status --short
git log -4 --oneline
```

Expected: only intentional feature changes are present; report any unrelated
pre-existing changes without modifying them.
