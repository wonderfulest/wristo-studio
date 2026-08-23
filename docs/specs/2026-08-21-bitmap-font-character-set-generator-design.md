# Bitmap Font Character-Set Generator Design

Date: 2026-08-21

Status: Approved design, pending implementation plan

Owners: `wristo-studio`, with package-publication validation changes in `wristo-api`

## Goal

Extend Studio's existing bitmap font maker into a character-set-driven online generator. The generator must support four presets—numbers, regular text, Chinese text, and icons—while showing and allowing edits to the actual characters or icons that will be built.

The existing route, 38-size build, BMFont output, atlas preview, ZIP download, and publication workflow remain the foundation.

## User Experience

The workbench keeps its staged layout:

1. Select the character-set type and input source.
2. Edit the character set and render style.
3. Inspect glyph and atlas previews.
4. Download or publish the generated package.

Changing the input source, character set, Unicode assignment, SVG content, or render recipe immediately marks an existing build as stale.

### Character-set presets

- `time_font`: starts with `0123456789:°`.
- `text_font`: starts with printable ASCII plus the existing supported punctuation characters.
- `text_font_zh`: starts with an editable, compact Chinese sample and common Chinese punctuation. It does not preload thousands of CJK characters.
- `icon_font`: starts empty and is populated from Studio's icon library or local SVG imports.

For text-based presets, the user can paste or type the desired content. The generator iterates by Unicode code point, removes duplicates while preserving first occurrence order, and treats line breaks as separators rather than glyphs.

The editor displays:

- the normalized source text;
- total unique glyph count;
- an actual glyph card for every character;
- its `U+XXXX` label;
- missing-font or rendering status.

The user may restore the active preset to its default value.

### Icon workflow

Icon mode does not require a TTF or OTF file. It supports:

- selecting multiple SVG assets from the existing Studio icon library;
- importing one or more local SVG files;
- editing an SVG through the existing Studio SVG editor;
- reordering and removing selected icons;
- editing each icon's Unicode assignment.

Icon-library assets retain their existing Unicode assignments. Local SVG files receive the first available Private Use Area code point starting at `U+E000`; users can override it. The UI rejects duplicate, surrogate, out-of-range, and otherwise invalid code points.

Each icon card shows the real SVG preview, name or symbol code, source, and assigned code point.

## Architecture

The implementation uses one build pipeline with two source adapters:

- Font source adapter: parses TTF/OTF and rasterizes selected character glyphs.
- SVG source adapter: sanitizes and rasterizes selected SVG glyphs directly.

Both adapters produce the same internal glyph record:

```text
codepoint, width, height, xoffset, yoffset, xadvance, alpha pixels
```

The existing atlas packer, BMFont writer, PNG encoder, ZIP builder, Web Worker client, progress reporting, cancellation, preview, and local validation consume these normalized glyph records.

Character sets are explicit build inputs. They are not recovered from the font type inside the package builder. A build request contains the ordered character-set code points and either a parsed font source or ordered SVG glyph sources.

For SVG glyphs, each target font size is rasterized directly from the vector source. A shared square em box, padding rule, alignment rule, baseline, and advance-width rule keep icon output visually consistent across sizes.

## Package Format

Every size continues to contain:

```text
<size>/<slug>-g_0.png
<size>/<slug>-g.fnt
```

The `.fnt` descriptor remains standard BMFont text and uses the assigned Unicode code point as each `char id`.

The manifest supports:

- `time_font`
- `text_font`
- `text_font_zh`
- `icon_font`

Its character set contains the exact ordered code points selected by the user. Legacy fixed packages continue using `wristo-number-v1` or `wristo-text-en-v1`. New editable text packages use `wristo-custom-v1`; SVG icon packages use `wristo-icon-svg-v1`.

Font-backed packages retain the source TTF/OTF. Icon packages store sanitized original SVGs under `sources/` and include deterministic icon metadata containing code point, name, source kind, source path, and SVG content hash. Icon packages do not include a fabricated font file.

Package hashes remain deterministic and cover every source, recipe, descriptor, atlas, and manifest-relevant artifact.

## Publication and API Validation

Local download supports all four types.

To publish the new package types, `wristo-api` must be updated with the Studio changes:

- accept `text_font_zh` and `icon_font` in bitmap-package publication;
- accept explicit custom character sets instead of requiring only the legacy fixed 12- and 100-codepoint lists;
- preserve strict validation for legacy profiles;
- validate unique, ordered, valid Unicode scalar values and configured glyph-count limits;
- verify that every `.fnt` descriptor exactly matches the manifest character set and atlas bounds;
- validate font sources for font-backed packages;
- validate the sanitized SVG source bundle for icon packages without requiring TTF/OTF;
- derive stored glyph count from the validated manifest;
- keep existing slug locking, ownership, rights attestation, storage promotion, and cleanup behavior.

The database and font-domain enum already support `text_font_zh` and `icon_font`; no new font type is introduced.

## Safety and Limits

SVG input must reject or remove:

- scripts;
- event-handler attributes;
- external URLs and external resource references;
- embedded raster images;
- unsafe XML constructs;
- unsupported or unbounded dimensions.

The client and server enforce matching limits for:

- glyph count per type;
- individual SVG bytes;
- total source bytes;
- atlas dimensions;
- generated PNG bytes;
- ZIP entries, compressed bytes, and expanded bytes.

Icon-library fetch or SVG parse failures remain attached to the affected icon card and block generation. The builder never silently omits a requested glyph.

Existing membership and administrator permissions continue to govern icon-library selection, upload, editing, and publication.

## Error Handling

Generation is blocked when:

- the character set is empty;
- a selected text character is missing from the uploaded font;
- a code point is duplicated or invalid;
- an icon is missing its SVG source;
- SVG sanitization or parsing fails;
- rasterization produces an empty glyph;
- an atlas exceeds configured limits.

Errors identify the affected character or icon. Build cancellation and stale-result protection continue to use request tokens and Web Worker cancellation.

Large Chinese builds report progress using both current font size and completed glyph work so the interface does not appear stalled.

## Verification

Focused Studio tests cover:

- preset defaults and reset;
- Unicode-code-point iteration, stable deduplication, and newline handling;
- editable Chinese and non-BMP characters;
- font coverage checks against the selected character set;
- icon-library mapping and local PUA allocation;
- Unicode conflict handling;
- SVG sanitization and deterministic rasterization;
- build invalidation after character, SVG, assignment, or recipe changes;
- manifests and packages for all four types;
- old number and English package compatibility;
- glyph-grid and atlas-preview state.

Focused API tests cover:

- legacy package acceptance;
- all new type/profile combinations;
- custom character-set validation;
- SVG source-bundle validation;
- descriptor, atlas, manifest, and hash mismatch rejection;
- size and security limits;
- publication metadata and persisted glyph counts.

Completion verification runs the focused Studio test suite, `npm run build`, relevant Maven tests in `wristo-api`, and a browser flow covering one font-backed Chinese build and one icon-library/local-SVG build when the local environment supports it.

## Out of Scope

- Editing individual pixels in a generated glyph bitmap.
- Combining font glyphs and SVG icons in one package during this iteration.
- Automatically loading the complete CJK Unicode repertoire.
- Converting SVG assets into a temporary or downloadable TTF icon font.
- Changing how Studio or Connect IQ reads standard BMFont atlas files.
