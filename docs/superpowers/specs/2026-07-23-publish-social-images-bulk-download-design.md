# Publish Social Images and Bulk Download Design

## Goal

Extend the Studio publish dialog so creators can see every image associated with
the app, including records whose type is `social`, and download all product and
social images in one ZIP archive using the image size set they need.

## Scope

- Display `product` images and `social` images in separate sections of the
  publish dialog.
- Treat the historical `share` type as `social` for display and serialization.
- Keep the existing combined 20-image limit and the existing publish payload.
- Add one bulk-download action covering every displayed product and social
  image.
- Offer thumbnail, original, and all-sizes download modes.
- Build the ZIP in the browser with the JSZip dependency already used by
  Studio.

This change does not add an API endpoint, change image upload semantics, or
generate image variants that the backend did not return.

## User Interface

The existing Product Images form item remains and displays only images whose
normalized type is `product`. A second Social Images form item displays images
whose type is `social` or the historical alias `share`. Both editors use the
same shared total count and 20-image limit.

A `Download all images` button appears with the image controls. It is disabled
when the combined image list is empty and shows a loading state while resources
are fetched and the ZIP is generated.

Clicking the button opens a three-option selector:

1. `Thumbnail` downloads one lightweight preview for each image.
2. `Original` downloads one original file for each image.
3. `All sizes` downloads the original plus every distinct declared format
   available on the image, such as `thumbnail`, `small`, `medium`, or `large`.

The selector starts no network work until the user chooses an option.

## Image Source Rules

Thumbnail mode resolves each image in this order:

1. `image.formats.thumbnail.url`
2. `previewUrl`
3. `image.previewUrl`
4. the display `imageUrl`

Original mode resolves each image in this order:

1. `downloadUrl`
2. `image.url`
3. the display `imageUrl`

All-sizes mode includes the resolved original and every valid entry in
`image.formats`. Duplicate URLs are written only once for that image. Missing
formats are skipped; Studio does not synthesize or resize images.

## ZIP Layout and Naming

The archive name includes the app ID:

`<appId>-product-images.zip`

Top-level directories preserve the semantic type:

```text
product/
social/
```

Thumbnail and original modes write one file per image with a stable,
collision-free name based on its list position and image ID. All-sizes mode
creates one subdirectory per image and names entries `original`, `thumbnail`,
`small`, `medium`, `large`, or the backend-provided format key while preserving
the extension inferred from the response URL or MIME type.

## Data Flow

`GoLiveDialog` continues to own the complete normalized `productImages` array.
It exposes separate computed models for the product and social editors through
the existing grouping and replacement helpers. Editing either group preserves
the other group and the shared global order.

The download action passes the complete normalized array and selected mode to a
focused ZIP helper. The helper:

1. Builds download entries from the image metadata.
2. Fetches each selected URL.
3. Writes successful blobs to JSZip.
4. Generates the archive and triggers one browser download.
5. Returns success and failure counts for UI feedback.

Publishing continues to serialize the complete array through
`toProductImageSelections`, which normalizes both `social` and `share` to
`social`.

## Error Handling

- If there are no downloadable images, show a localized informational message.
- If an image lacks a URL for the chosen mode, record it as failed and continue.
- If an individual fetch fails, continue downloading the remaining images.
- If at least one file succeeds, generate the ZIP and report the number of
  skipped or failed files.
- If every file fails, do not generate an empty ZIP; show a localized error.
- Always clear the loading state after completion or failure.

## Localization

Add English and Chinese strings for:

- Social Images
- Download all images
- Thumbnail
- Original
- All sizes
- Preparing image archive
- Empty-image, partial-failure, and total-failure feedback

## Verification

Add focused tests for:

- Grouping `product`, `social`, and historical `share` images.
- Rendering both image sections with one shared limit.
- Building thumbnail and original entries with the documented fallback order.
- Building all-sizes entries without duplicate URLs.
- ZIP folder/type organization and stable file naming.
- Partial failures producing a non-empty ZIP and a failure count.
- Total failure preventing an empty download.

Run the focused Studio tests and `npm run build`. Any unrelated repository-wide
failure is reported separately from the feature verification.
