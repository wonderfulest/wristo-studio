# Submit Design Style Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Studio submit-time categories with one-to-five required style tags and persist those selections in `product_tag_rel`.

**Architecture:** A focused backend relation service validates and replaces manual style-tag relations transactionally, while existing design submit/update orchestrators call it and product details expose tags for restoration. Studio owns a typed tag API client and a small pure selection model, then binds those pieces into `SubmitDesignDialog.vue` without changing unrelated category screens.

**Tech Stack:** Java 17, Spring Boot, MyBatis, JUnit 5, Mockito, Vue 3, TypeScript, Element Plus, Axios, Vitest.

---

## File map

Backend (`wristo-api`):

- Create `src/main/java/com/wukong/face/modules/products/tag/entity/ProductTagRel.java`: relation row model.
- Create `src/main/java/com/wukong/face/modules/products/tag/mapper/ProductTagRelMapper.java`: relation reads and soft-delete/upsert writes.
- Create `src/main/resources/mapper/ProductTagRelMapper.xml`: SQL for active product tags and manual style replacement.
- Create `src/main/java/com/wukong/face/modules/products/tag/service/ProductTagRelationService.java`: validation and transactional replacement boundary.
- Create `src/main/java/com/wukong/face/modules/products/tag/service/impl/ProductTagRelationServiceImpl.java`: enforce one-to-five enabled style tags.
- Modify `ProductTagMapper.java` and `ProductTagMapper.xml`: bulk lookup selected IDs.
- Modify `DesignSubmitDTO.java` and `DesignUpdateDTO.java`: receive `tagIds`.
- Modify `ProductVO.java`: return `tags`.
- Modify `DesignOrchestratorImpl.java`: save tags during submit/update and populate them in product detail.
- Create `src/test/java/com/wukong/face/modules/products/tag/service/ProductTagRelationServiceImplTest.java`: validation/replacement unit tests.
- Modify `src/test/java/com/wukong/face/modules/design/service/impl/DesignOrchestratorImplPaymentTest.java`: verify orchestration passes tag IDs without regressing payment behavior.

Frontend (`wristo-studio`):

- Create `src/types/api/productTag.ts`: typed dictionary/page response models.
- Create `src/api/wristo/productTags.ts`: exact page request with `pageSize=200`.
- Create `src/components/common/styleTagSelection.ts`: pure filtering and five-item limit helpers.
- Create `src/components/common/styleTagSelection.test.ts`: helper tests.
- Create `src/components/common/StyleTagSelector.vue`: reusable required multi-select.
- Modify `src/components/dialogs/SubmitDesignDialog.vue`: replace categories, load/restore tags, submit `tagIds`.
- Modify `src/types/api/design.ts` and `src/types/product.ts`: request/response tag contracts.
- Modify `src/i18n.ts`: localized labels, tips, warnings, and load error.
- Create `src/components/dialogs/SubmitDesignStyleTags.test.ts`: source-level integration assertions for payload and replacement.

Before editing `wristo-api`, run `git status --short` and inspect diffs for every overlapping dirty file, especially `DesignOrchestratorImpl.java` and related DTO/controller code. Patch around user changes; do not restore or reformat unrelated hunks.

### Task 1: Backend tag relation persistence

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/entity/ProductTagRel.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/mapper/ProductTagRelMapper.java`
- Create: `wristo-api/src/main/resources/mapper/ProductTagRelMapper.xml`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/mapper/ProductTagMapper.java`
- Modify: `wristo-api/src/main/resources/mapper/ProductTagMapper.xml`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/products/tag/service/ProductTagRelationServiceImplTest.java`

- [ ] **Step 1: Write failing mapper/service-facing tests**

Create tests that pass IDs `[1L, 2L]`, assert bulk lookup is used once, and assert deselect/upsert mapper calls receive the product ID and unique IDs. Add rejection cases for empty, six IDs, duplicates, missing IDs, `status=0`, and `tagGroup="function"`.

```java
assertThrows(BizException.class, () -> service.replaceManualStyleTags(9L, List.of()));
assertThrows(BizException.class, () -> service.replaceManualStyleTags(9L, List.of(1L, 1L)));
verify(relMapper).softDeleteManualStyleTagsExcept(9L, List.of(1L, 2L));
verify(relMapper).upsertManualRelations(9L, List.of(1L, 2L));
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd wristo-api && mvn -Dtest=ProductTagRelationServiceImplTest test`

Expected: compilation fails because `ProductTagRelationServiceImpl` and relation mapper do not exist.

- [ ] **Step 3: Add bulk tag lookup and relation mapper**

Add `List<ProductTag> selectByIds(@Param("ids") List<Long> ids)` using `WHERE t.id IN (...) GROUP BY t.id`, plus:

```java
List<ProductTag> selectActiveByProductId(@Param("productId") Long productId);
int softDeleteManualStyleTagsExcept(@Param("productId") Long productId,
                                    @Param("tagIds") List<Long> tagIds);
int upsertManualRelations(@Param("productId") Long productId,
                          @Param("tagIds") List<Long> tagIds);
```

The soft-delete SQL must join `product_tag`, limit deletion to `source='manual'` and `tag_group='style'`, and keep selected IDs. Upsert with `ON DUPLICATE KEY UPDATE source='manual', is_deleted=0, updated_at=CURRENT_TIMESTAMP(6)`.

- [ ] **Step 4: Run mapper XML parsing coverage**

Run: `cd wristo-api && mvn -DskipTests compile`

Expected: `BUILD SUCCESS`; MyBatis interfaces and XML compile without signature errors.

- [ ] **Step 5: Commit the persistence primitives**

```bash
git -C wristo-api add src/main/java/com/wukong/face/modules/products/tag/entity/ProductTagRel.java src/main/java/com/wukong/face/modules/products/tag/mapper/ProductTagRelMapper.java src/main/java/com/wukong/face/modules/products/tag/mapper/ProductTagMapper.java src/main/resources/mapper/ProductTagRelMapper.xml src/main/resources/mapper/ProductTagMapper.xml src/test/java/com/wukong/face/modules/products/tag/service/ProductTagRelationServiceImplTest.java
git -C wristo-api commit -m "add product style tag relations"
```

### Task 2: Backend validation service

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/service/ProductTagRelationService.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/service/impl/ProductTagRelationServiceImpl.java`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/products/tag/service/ProductTagRelationServiceImplTest.java`

- [ ] **Step 1: Implement the interface and minimal validator**

```java
public interface ProductTagRelationService {
    void replaceManualStyleTags(Long productId, List<Long> tagIds);
    List<ProductTagVO> getActiveTags(Long productId);
}
```

Normalize no values: reject `null`, sizes outside `1..5`, duplicates, lookup-count mismatch, inactive records, and non-style groups using `BizErrorCode.INVALID_PARAMS`. Only after all validation passes call both relation writes under `@Transactional`.

- [ ] **Step 2: Run the focused test**

Run: `cd wristo-api && mvn -Dtest=ProductTagRelationServiceImplTest test`

Expected: all validation and replacement cases pass.

- [ ] **Step 3: Commit the service**

```bash
git -C wristo-api add src/main/java/com/wukong/face/modules/products/tag/service src/test/java/com/wukong/face/modules/products/tag/service/ProductTagRelationServiceImplTest.java
git -C wristo-api commit -m "validate submitted style tags"
```

### Task 3: Connect tags to design submit, update, and detail

**Files:**
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/dto/DesignSubmitDTO.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/dto/DesignUpdateDTO.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/vo/ProductVO.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/design/service/impl/DesignOrchestratorImpl.java`
- Modify: `wristo-api/src/test/java/com/wukong/face/modules/design/service/impl/DesignOrchestratorImplPaymentTest.java`

- [ ] **Step 1: Add failing orchestration assertions**

For submit and update, set `tagIds` to `[1L, 2L]` and verify:

```java
verify(productTagRelationService).replaceManualStyleTags(product.getId(), List.of(1L, 2L));
```

For populated detail, stub `getActiveTags(product.getId())` and assert `vo.getProduct().getTags()` contains the returned tags.

- [ ] **Step 2: Run the focused orchestration test and verify failure**

Run: `cd wristo-api && mvn -Dtest=DesignOrchestratorImplPaymentTest test`

Expected: compilation or verification failure because DTOs and orchestration do not expose tag IDs.

- [ ] **Step 3: Add the request and response fields**

Add `private List<Long> tagIds;` to both DTOs and `private List<ProductTagVO> tags;` to `ProductVO`.

- [ ] **Step 4: Wire transactional writes and detail reads**

Inject `ProductTagRelationService`. Immediately after product creation/update is known to have a product ID, call `replaceManualStyleTags(product.getId(), dto.getTagIds())`. When populating a product in `toDesignVO`, always attach `getActiveTags(product.getId())` because Submit Design requests populated product detail and needs restoration.

- [ ] **Step 5: Run backend focused tests**

Run: `cd wristo-api && mvn -Dtest=ProductTagRelationServiceImplTest,DesignOrchestratorImplPaymentTest test`

Expected: `BUILD SUCCESS` and both test classes pass.

- [ ] **Step 6: Commit backend integration**

```bash
git -C wristo-api add src/main/java/com/wukong/face/modules/design/dto/DesignSubmitDTO.java src/main/java/com/wukong/face/modules/design/dto/DesignUpdateDTO.java src/main/java/com/wukong/face/modules/products/vo/ProductVO.java src/main/java/com/wukong/face/modules/design/service/impl/DesignOrchestratorImpl.java src/test/java/com/wukong/face/modules/design/service/impl/DesignOrchestratorImplPaymentTest.java
git -C wristo-api commit -m "save style tags on design submission"
```

### Task 4: Studio tag API and selection model

**Files:**
- Create: `wristo-studio/src/types/api/productTag.ts`
- Create: `wristo-studio/src/api/wristo/productTags.ts`
- Create: `wristo-studio/src/components/common/styleTagSelection.ts`
- Create: `wristo-studio/src/components/common/styleTagSelection.test.ts`

- [ ] **Step 1: Write failing helper tests**

```ts
expect(filterEnabledStyleTags(items).map(item => item.id)).toEqual([1, 2])
expect(limitStyleTagSelection([1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6], 5)).toEqual({ ids: [1, 2, 3, 4, 5], exceeded: true })
expect(limitStyleTagSelection([], [2, 2], 5)).toEqual({ ids: [2], exceeded: false })
```

- [ ] **Step 2: Run the helper test and verify failure**

Run: `cd wristo-studio && npm run test:unit -- src/components/common/styleTagSelection.test.ts`

Expected: module-not-found failure.

- [ ] **Step 3: Add typed API and pure helpers**

`getProductTagsPage()` must call:

```ts
instance.get('/admin/product-tags/page', {
  params: { pageNum: 1, pageSize: 200, orderBy: 'sort:desc' },
})
```

Define `ProductTag`, `ProductTagPage`, filter enabled style tags without re-sorting, and limit unique selections to five.

- [ ] **Step 4: Run the helper test**

Run: `cd wristo-studio && npm run test:unit -- src/components/common/styleTagSelection.test.ts`

Expected: all tests pass.

- [ ] **Step 5: Commit API/model work**

```bash
git -C wristo-studio add src/types/api/productTag.ts src/api/wristo/productTags.ts src/components/common/styleTagSelection.ts src/components/common/styleTagSelection.test.ts
git -C wristo-studio commit -m "add Studio style tag model"
```

### Task 5: Studio selector component

**Files:**
- Create: `wristo-studio/src/components/common/StyleTagSelector.vue`
- Modify: `wristo-studio/src/i18n.ts`

- [ ] **Step 1: Build the selector against the pure model**

Expose `tagIds`, `tags`, and `loading` props plus `update:tagIds`. Render `el-select` with `multiple` and `filterable`; use tag `name` labels and numeric IDs. On overflow emit the limited prior selection and call `ElMessage.warning(t('styleTags.limit', { limit: 5 }))`.

- [ ] **Step 2: Add all locale fallbacks**

Add at least these keys to the base English and Chinese dictionaries, allowing existing locale fallback behavior for other languages:

```ts
'styleTags.label': 'Style Tags',
'styleTags.placeholder': 'Select style tags',
'styleTags.required': 'Select at least one style tag',
'styleTags.limit': 'Select up to {limit} style tags',
'styleTags.loadFailed': 'Failed to load style tags',
```

- [ ] **Step 3: Run static validation**

Run: `cd wristo-studio && npm run build`

Expected: TypeScript and Vite build succeed.

- [ ] **Step 4: Commit the selector**

```bash
git -C wristo-studio add src/components/common/StyleTagSelector.vue src/i18n.ts
git -C wristo-studio commit -m "add style tag selector"
```

### Task 6: Replace categories in Submit Design

**Files:**
- Modify: `wristo-studio/src/components/dialogs/SubmitDesignDialog.vue`
- Modify: `wristo-studio/src/types/api/design.ts`
- Modify: `wristo-studio/src/types/product.ts`
- Create: `wristo-studio/src/components/dialogs/SubmitDesignStyleTags.test.ts`

- [ ] **Step 1: Write failing integration assertions**

Read the component source and assert it imports/renders `StyleTagSelector`, sets `tagIds: form.tagIds` in both request paths, requests tags, and no longer imports/renders `CategorySelector` or calls `loadCategories`.

- [ ] **Step 2: Run the integration test and verify failure**

Run: `cd wristo-studio && npm run test:unit -- src/components/dialogs/SubmitDesignStyleTags.test.ts`

Expected: assertions fail against the current category-based component.

- [ ] **Step 3: Update TypeScript contracts**

Add `tagIds?: number[]` to `DesignSubmitDTO` and `UpdateDesignParamsV2`; add `tags?: ProductTag[]` to `Product`.

- [ ] **Step 4: Replace dialog state and loading**

Remove `CategorySelector`, `getBasicCategories`, category state/rules, and `CATEGORY_LIMIT` from this dialog. Add `tagIds`, tag options/loading state, a required array rule, and `loadStyleTags()` using the new client. Initialize from enabled style tags intersected with `product.tags`, and load options plus Bundles before opening.

- [ ] **Step 5: Send tag IDs through both save paths**

Set `tagIds: form.tagIds` in `DesignSubmitDTO` and `UpdateDesignParamsV2`. On option-load failure, clear options/selections, show `styleTags.loadFailed`, and keep required validation blocking submission.

- [ ] **Step 6: Run focused frontend tests and build**

Run: `cd wristo-studio && npm run test:unit -- src/components/common/styleTagSelection.test.ts src/components/dialogs/SubmitDesignStyleTags.test.ts`

Expected: both test files pass.

Run: `cd wristo-studio && npm run build`

Expected: TypeScript checks and Vite production build succeed.

- [ ] **Step 7: Commit dialog integration**

```bash
git -C wristo-studio add src/components/dialogs/SubmitDesignDialog.vue src/components/dialogs/SubmitDesignStyleTags.test.ts src/types/api/design.ts src/types/product.ts
git -C wristo-studio commit -m "use style tags when submitting designs"
```

### Task 7: End-to-end verification

**Files:**
- Verify only; fix failures in the files introduced above.

- [ ] **Step 1: Run backend focused verification**

Run: `cd wristo-api && mvn -Dtest=ProductTagRelationServiceImplTest,DesignOrchestratorImplPaymentTest test`

Expected: `BUILD SUCCESS`.

- [ ] **Step 2: Run Studio focused verification**

Run: `cd wristo-studio && npm run test:unit -- src/components/common/styleTagSelection.test.ts src/components/dialogs/SubmitDesignStyleTags.test.ts && npm run build`

Expected: tests pass and build completes.

- [ ] **Step 3: Perform manual contract check**

Open Submit Design and verify the network request contains `pageNum=1`, `pageSize=200`, `orderBy=sort:desc`; only enabled style tags appear; zero tags blocks submission; a sixth tag is rejected; submission JSON contains one-to-five numeric `tagIds`; reopening restores saved selections.

- [ ] **Step 4: Review repository state**

Run: `git -C wristo-api status --short && git -C wristo-studio status --short`

Expected: only pre-existing user changes or intentional task changes remain. Report focused test results separately from unrelated baseline failures.
