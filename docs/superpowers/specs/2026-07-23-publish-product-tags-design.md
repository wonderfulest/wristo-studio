# Publish Product Tags

## Goal

Return every enabled product tag from the Studio tag endpoint and replace the Publish dialog's category selection with required product tags. Publish accepts one to five enabled tags from any tag group, while Submit Design continues to accept only style tags.

## API Listing Contract

`GET /api/dsn/product-tags/page` keeps the existing authenticated Studio permissions, paging envelope, `pageSize` maximum of 200, and safe `sort:asc|desc` ordering. The endpoint forces only `status=1`; it no longer forces `tagGroup=style`. The response therefore contains every enabled style, function, scene, seasonal, and future tag group.

Studio continues to request `pageNum=1`, `pageSize=200`, and `orderBy=sort:desc`. Submit Design keeps its client-side enabled-style filter. Publish consumes the same response without a tag-group filter.

## Publish UI

`GoLiveDialog.vue` removes its Category selector and category loading state. It adds a filterable multiple Tag selector backed by all enabled Dsn tag options. Selection is required, accepts one to five unique numeric tag IDs, and rejects a sixth selection while preserving the previous five.

The selector reuses the existing tag option and selection primitives where possible, but its label and copy describe general Tags rather than Style Tags. Opening Publish restores selected IDs from `product.tags` in API option order, omitting missing or disabled tags and capping restoration at five.

If tag loading fails or returns an invalid response, Publish still opens so other data remains visible. The tag selector is disabled, an explicit load error is shown, and publish submission is blocked without calling the API.

## Publish Request Contract

Studio's `GoToLiveDto` replaces `categoryIds` with `tagIds`. `GoLiveDialog.vue` sends selected `tagIds` in `/dsn/products/publish` and no longer sends categories. Bundle, payment, description, images, Garmin URLs, and all other publish fields remain unchanged.

The backend `GoToLiveDTO` also replaces `categoryIds` with `tagIds`. `ProductOrchestratorImpl.goToLive()` stops updating category relations and updates product tag relations within its existing transaction instead.

## Tag Validation And Persistence

The existing style-only replacement method remains unchanged for Submit Design. A separate general replacement operation validates Publish selections:

- product ID exists and is active;
- `tagIds` is present and contains one to five unique IDs;
- every selected tag exists and has `status=1`;
- any tag group is accepted.

After validation, the operation soft-deletes deselected manual tag relations for the product and upserts selected relations. It preserves non-manual relations and never overwrites their `source`. All writes remain transactionally coupled to Publish.

## Legacy Categories

Publish no longer creates or changes category relations. Existing category relations are preserved for backward compatibility; this change does not delete or migrate them. Other admin, Store, and category-based discovery flows remain outside scope.

## Error Handling

Frontend validation provides immediate one-to-five feedback, while backend validation remains authoritative. Invalid, inactive, or missing tag IDs produce a business validation error and do not partially update either publish data or tag relations. A tag dictionary load failure blocks both initial publish and republish requests.

## Verification

- Dsn controller tests verify all enabled groups are returned and disabled tags remain excluded.
- Tag relation service tests cover general-group acceptance, inactive/missing/duplicate/empty/over-limit rejection, source preservation, and replacement SQL.
- Publish orchestration tests verify `tagIds` replace tags and `categoryIds` are no longer consumed.
- Mounted Studio tests cover all-group options, restoration, one-to-five validation, publish payloads, and load-failure blocking.
- Submit Design regression tests verify it still filters and submits only enabled style tags.
- Focused Maven and Vitest suites plus the Studio production build run after integration.
