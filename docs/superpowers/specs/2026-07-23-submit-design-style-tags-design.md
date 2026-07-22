# Submit Design Style Tags

## Goal

Replace the category selector in the Studio submit-design dialog with a required style-tag selector backed by the product-tag dictionary. A designer can select one to five enabled style tags, and the selected product-tag relations are persisted with the submitted product.

## Scope

- Change the submit-design dialog and its request types in `wristo-studio`.
- Load tag options from `/api/admin/product-tags/page` with `pageNum=1`, `pageSize=200`, and `orderBy=sort:desc`.
- Extend the design submission and update paths in `wristo-api` to accept, validate, persist, and return product tags.
- Preserve the existing Bundle selector and unrelated submission behavior.
- Remove the category selector from this dialog only. Other category management and go-live flows are outside this change.

## Studio UI

The submit-design dialog displays a filterable, multiple-select field labeled `Style Tags` in place of the category selector. It lists only response items where `tagGroup` is `style` and `status` is `1`, retaining the API's descending sort order.

The field is required and accepts at most five unique tag IDs. Attempts to select a sixth tag keep the first five and show a localized warning. Form validation blocks submission when no tag is selected. Loading failure leaves the selector unavailable, shows an error, and blocks submission because no valid selection can be established.

When editing or resubmitting a product, the dialog initializes the selection from the product's returned tags. Any returned tag that is no longer an enabled style option is not selectable and is not submitted again.

## Client Data Flow

Studio adds a typed product-tag API client and response types. Opening the dialog loads the design detail and, in parallel where safe, the tag options and Bundles. The form stores selected values as `tagIds: number[]`.

Both normal design submission and the PRG-build save path include `tagIds`. The obsolete `categoryIds` field and category loading logic are removed from `SubmitDesignDialog.vue`, but remain available in shared types and other screens that still use categories.

## Backend Contract

`DesignSubmitDTO` and `DesignUpdateDTO` accept `tagIds: List<Long>`. Product detail responses expose a `tags` collection containing at least `id`, `name`, `slug`, `tagGroup`, `sort`, and `status`, allowing Studio to restore the selection.

For submission and design-update save paths, the backend validates that:

- `tagIds` is present and contains between one and five unique IDs;
- every ID exists;
- every selected tag has `tag_group = style` and `status = 1`.

Invalid input returns a business validation error and does not partially update product relations.

## Persistence

A focused product-tag relation mapper/service owns `product_tag_rel`. Updating tags for a product replaces its active manual style-tag relations in one transaction while preserving unrelated relation sources or non-style relations. Existing matching rows may be reactivated; deselected manual style rows are soft-deleted.

Newly created products receive their tag relations during design submission. Existing products receive updated relations through the design-update path used before PRG builds. Reads query active relations and attach their tag records in descending tag sort order.

## Error Handling

The UI distinguishes tag-option loading failure from generic design-detail failure. Backend validation remains authoritative even if a client bypasses UI checks. Relation persistence participates in the surrounding transaction so a failed tag update cannot leave the product submission half-complete.

## Verification

- Studio unit tests cover response filtering, the one-to-five selection constraint, request payloads, and edit-time restoration.
- Studio build validates Vue and TypeScript integration.
- Backend tests cover valid persistence, empty selection, more than five IDs, duplicates, inactive tags, non-style tags, and transaction-safe replacement.
- Focused Maven tests validate submission and update orchestration without claiming unrelated existing tests are green.
