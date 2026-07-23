# Publish Product Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return every enabled product tag to Studio and make Publish persist one-to-five tags from any group instead of updating categories.

**Architecture:** The Dsn dictionary endpoint remains authenticated and paginated but forces only enabled status. A general tag-relation replacement operation shares the existing validation/persistence primitives without weakening Submit Design's style-only method. Go Live sends `tagIds`, and Studio uses a general tag selector while retaining the style-filtered Submit Design flow.

**Tech Stack:** Java 17, Spring Boot, MyBatis, JUnit 5, Mockito, Vue 3, TypeScript, Element Plus, Axios, Vitest.

---

## File map

Backend (`wristo-api`):

- Modify `ProductTagDsnController.java`: remove the forced style group and keep `status=1`.
- Modify `ProductTagRelationService.java` and `ProductTagRelationServiceImpl.java`: add general enabled-tag replacement.
- Modify `ProductTagRelMapper.java` and `ProductTagRelMapper.xml`: soft-delete all deselected manual tag relations for Publish.
- Modify `GoToLiveDTO.java`: replace `categoryIds` with `tagIds`.
- Modify `ProductOrchestratorImpl.java`: replace tag relations during Go Live and stop updating categories.
- Modify focused Dsn, relation-service, SQL, and Go Live orchestration tests.

Frontend (`wristo-studio`):

- Create `ProductTagSelector.vue`: general all-group tag selector using existing selection helpers.
- Create focused selector tests and Publish tag helpers/tests.
- Modify `GoLiveDialog.vue`: load all enabled tags, restore product tags, validate and submit `tagIds`.
- Modify `types/product.ts`: replace `GoToLiveDto.categoryIds` with `tagIds`.
- Modify `i18n.ts`: add general product-tag Publish copy.
- Modify mounted Go Live tests and retain Submit Design regression tests.

Before editing, inspect current dirty diffs in both repositories. Patch around user changes in `ProductOrchestratorImpl.java`, `GoLiveDialog.vue`, `i18n.ts`, and product types; never restore unrelated hunks.

### Task 1: Return all enabled Dsn tags

**Files:**
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/controller/dsn/ProductTagDsnController.java`
- Modify: `wristo-api/src/test/java/com/wukong/face/modules/products/tag/controller/dsn/ProductTagDsnControllerTest.java`

- [ ] **Step 1: Write a failing controller test**

Capture the DTO passed to `ProductTagService.page()` and assert:

```java
assertEquals(1, query.getStatus());
assertNull(query.getTagGroup());
assertEquals(200, query.getPageSize());
assertEquals("sort:desc", query.getOrderBy());
```

- [ ] **Step 2: Run the test and verify the current failure**

Run: `cd wristo-api && mvn -Dtest=ProductTagDsnControllerTest test`

Expected: failure because `tagGroup` is currently `style`.

- [ ] **Step 3: Remove only the group restriction**

Delete `query.setTagGroup("style")`; preserve `query.setStatus(1)`, page-size clamping, safe sort normalization, and existing security.

- [ ] **Step 4: Run Dsn controller and security tests**

Run: `cd wristo-api && mvn -Dtest=ProductTagDsnControllerTest,ProductTagDsnSecurityTest test`

Expected: all tests pass; Studio FREE remains allowed and unrelated/anonymous callers remain denied.

- [ ] **Step 5: Commit**

```bash
git -C wristo-api add src/main/java/com/wukong/face/modules/products/tag/controller/dsn/ProductTagDsnController.java src/test/java/com/wukong/face/modules/products/tag/controller/dsn/ProductTagDsnControllerTest.java
git -C wristo-api commit -m "return all enabled Studio tags"
```

### Task 2: Add general manual tag replacement

**Files:**
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/service/ProductTagRelationService.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/service/impl/ProductTagRelationServiceImpl.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/tag/mapper/ProductTagRelMapper.java`
- Modify: `wristo-api/src/main/resources/mapper/ProductTagRelMapper.xml`
- Modify: `wristo-api/src/test/java/com/wukong/face/modules/products/tag/service/ProductTagRelationServiceImplTest.java`
- Modify: `wristo-api/src/test/java/com/wukong/face/modules/products/tag/mapper/ProductTagRelMapperSqlTest.java`

- [ ] **Step 1: Write failing service and SQL tests**

Add `replaceManualTags(productId, tagIds)` tests proving style/function/scene tags are accepted together, while null/empty, six, duplicates, missing, and inactive tags are rejected before writes. SQL assertions must prove Publish soft-deletes every deselected `source='manual'` relation without a `tag_group='style'` predicate and preserves all non-manual sources.

```java
service.replaceManualTags(9L, List.of(1L, 28L, 38L));
verify(relMapper).softDeleteManualTagsExcept(9L, List.of(1L, 28L, 38L));
verify(relMapper).upsertManualRelations(9L, List.of(1L, 28L, 38L));
```

- [ ] **Step 2: Run tests and verify failure**

Run: `cd wristo-api && mvn -Dtest=ProductTagRelationServiceImplTest,ProductTagRelMapperSqlTest test`

Expected: compilation failure because the general API and mapper method do not exist.

- [ ] **Step 3: Implement the separate general path**

Add:

```java
void replaceManualTags(Long productId, List<Long> tagIds);
int softDeleteManualTagsExcept(Long productId, List<Long> tagIds);
```

Factor common product/size/duplicate/existence/status validation into private helpers. The existing style method adds the style-group check; the general method omits only that check. Both call the source-preserving upsert.

- [ ] **Step 4: Run focused tests and compile**

Run: `cd wristo-api && mvn -Dtest=ProductTagRelationServiceImplTest,ProductTagRelMapperSqlTest test && mvn -DskipTests compile`

Expected: all focused tests and compilation pass.

- [ ] **Step 5: Commit**

```bash
git -C wristo-api add src/main/java/com/wukong/face/modules/products/tag src/main/resources/mapper/ProductTagRelMapper.xml src/test/java/com/wukong/face/modules/products/tag
git -C wristo-api commit -m "support general product tag replacement"
```

### Task 3: Replace Go Live categories with tag IDs

**Files:**
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/dto/GoToLiveDTO.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/orchestrator/impl/ProductOrchestratorImpl.java`
- Create or modify: `wristo-api/src/test/java/com/wukong/face/modules/products/orchestrator/impl/ProductOrchestratorImplGoLiveTagsTest.java`

- [ ] **Step 1: Write failing orchestration tests**

For a valid publish DTO with `[1L, 28L]`, verify:

```java
verify(productTagRelationService).replaceManualTags(product.getId(), List.of(1L, 28L));
verifyNoInteractions(categoryProductRelMapper);
verify(productService, never()).updateCategory(any());
```

Also make `replaceManualTags` throw `BizException` and assert the exact exception propagates before product persistence/search sync.

- [ ] **Step 2: Run and verify failure**

Run: `cd wristo-api && mvn -Dtest=ProductOrchestratorImplGoLiveTagsTest test`

Expected: DTO lacks `tagIds` and Go Live still updates categories.

- [ ] **Step 3: Change the publish contract**

Replace `private List<Long> categoryIds;` with `private List<Long> tagIds;`. Inject/use `ProductTagRelationService` in `goToLive()`:

```java
productTagRelationService.replaceManualTags(product.getId(), dto.getTagIds());
```

Remove the Go Live category-update block only. Do not delete category dependencies used elsewhere in the orchestrator.

- [ ] **Step 4: Run publish and relation regression tests**

Run: `cd wristo-api && mvn -Dtest=ProductOrchestratorImplGoLiveTagsTest,ProductTagRelationServiceImplTest,DesignOrchestratorImplStyleTagTest test`

Expected: Publish uses all enabled groups; Submit Design remains style-only.

- [ ] **Step 5: Commit**

```bash
git -C wristo-api add src/main/java/com/wukong/face/modules/products/dto/GoToLiveDTO.java src/main/java/com/wukong/face/modules/products/orchestrator/impl/ProductOrchestratorImpl.java src/test/java/com/wukong/face/modules/products/orchestrator/impl/ProductOrchestratorImplGoLiveTagsTest.java
git -C wristo-api commit -m "publish products with tags"
```

### Task 4: Add a general Product Tag selector

**Files:**
- Create: `wristo-studio/src/components/common/ProductTagSelector.vue`
- Create: `wristo-studio/src/components/common/ProductTagSelector.test.ts`
- Modify: `wristo-studio/src/i18n.ts`

- [ ] **Step 1: Write failing behavioral tests**

Mount with style/function/scene options and assert all remain visible in input order, normal selection emits unique IDs, a sixth selection preserves the prior five and warns, and loading/disabled/form prop work.

- [ ] **Step 2: Run and verify failure**

Run: `cd wristo-studio && npm run test:unit -- src/components/common/ProductTagSelector.test.ts`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the selector**

Reuse `limitStyleTagSelection` (rename to a general `limitTagSelection` with a compatibility export if necessary) and `ProductTag`. Expose the same controlled props as StyleTagSelector but render `productTags.*` copy and do not filter groups.

- [ ] **Step 4: Add localized copy and run tests**

Add English/Chinese keys for label, placeholder, required, limit, tip, and load failure. Run:

`cd wristo-studio && npm run test:unit -- src/components/common/ProductTagSelector.test.ts src/components/common/styleTagSelection.test.ts && npx vue-tsc --noEmit`

Expected: tests and typecheck pass.

- [ ] **Step 5: Commit**

```bash
git -C wristo-studio add src/components/common/ProductTagSelector.vue src/components/common/ProductTagSelector.test.ts src/components/common/styleTagSelection.ts src/components/common/styleTagSelection.test.ts src/i18n.ts
git -C wristo-studio commit -m "add product tag selector"
```

### Task 5: Integrate tags into Publish

**Files:**
- Modify: `wristo-studio/src/components/dialogs/GoLiveDialog.vue`
- Create: `wristo-studio/src/components/dialogs/goLiveTags.ts`
- Create: `wristo-studio/src/components/dialogs/GoLiveProductTags.test.ts`
- Modify: `wristo-studio/src/types/product.ts`
- Preserve: existing Go Live image/payment tests.

- [ ] **Step 1: Write failing helper and mounted tests**

Tests must prove all enabled groups appear, disabled records are excluded, restoration follows API order and caps five, `tagIds` is required/unique/max-five, Publish payload contains `tagIds` and not `categoryIds`, and rejected/nonzero/invalid loads keep the dialog visible but block `productsApi.publish`.

- [ ] **Step 2: Run and verify failure**

Run: `cd wristo-studio && npm run test:unit -- src/components/dialogs/GoLiveProductTags.test.ts`

Expected: failures because Go Live still uses categories.

- [ ] **Step 3: Replace category state and request fields**

Remove Category imports/component/loading and `categoryIds` from this dialog. Add ProductTagSelector, Dsn tag loading, failure state, `tagIds`, rules, and restoration from `design.product.tags`. Update `GoToLiveDto`:

```ts
tagIds: number[]
```

Load tags and Bundles independently. A tag failure must not hide the dialog, but must clear/disable tags and block confirmation.

- [ ] **Step 4: Preserve Submit Design filtering**

Run the Submit Design mounted and helper suites to verify its `filterEnabledStyleTags` call remains unchanged.

- [ ] **Step 5: Run focused tests and build**

Run: `cd wristo-studio && npm run test:unit -- src/components/common/ProductTagSelector.test.ts src/components/dialogs/GoLiveProductTags.test.ts src/components/dialogs/SubmitDesignDialog.behavior.test.ts src/components/dialogs/SubmitDesignStyleTags.test.ts src/api/wristo/productTags.test.ts && npm run build`

Expected: all tests pass and Vite build succeeds.

- [ ] **Step 6: Commit**

```bash
git -C wristo-studio add src/components/dialogs/GoLiveDialog.vue src/components/dialogs/goLiveTags.ts src/components/dialogs/GoLiveProductTags.test.ts src/types/product.ts
git -C wristo-studio commit -m "publish with product tags"
```

### Task 6: Cross-repository verification

**Files:**
- Verify only; repair failures only in task-owned files.

- [ ] **Step 1: Run backend focused verification**

Run: `cd wristo-api && mvn -Dtest=ProductTagDsnControllerTest,ProductTagDsnSecurityTest,ProductTagRelationServiceImplTest,ProductTagRelMapperSqlTest,ProductOrchestratorImplGoLiveTagsTest,DesignOrchestratorImplStyleTagTest test`

Expected: `BUILD SUCCESS`.

- [ ] **Step 2: Run Studio focused verification**

Run: `cd wristo-studio && npm run test:unit -- src/api/wristo/productTags.test.ts src/components/common/styleTagSelection.test.ts src/components/common/StyleTagSelector.test.ts src/components/common/ProductTagSelector.test.ts src/components/dialogs/SubmitDesignDialog.behavior.test.ts src/components/dialogs/GoLiveProductTags.test.ts && npm run build`

Expected: all tests pass and production build succeeds.

- [ ] **Step 3: Inspect final request contracts**

Confirm Dsn response contains enabled tags across groups, Submit Design sends only style tag IDs, Publish displays all enabled tags and sends `tagIds`, and neither Publish frontend nor `goToLive()` writes category IDs.

- [ ] **Step 4: Review repository states**

Run: `git -C wristo-api status --short && git -C wristo-studio status --short`

Expected: only intentional feature changes plus pre-existing user changes remain; report known Maven/Sass/chunk warnings separately.
