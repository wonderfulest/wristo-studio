# Garmin System Fonts in Wristo Studio

## Summary

Wristo Studio will support Garmin Connect IQ system-font constants for the six most common text element types: time, date, plain text, data value, data label, and data unit. The editor will resolve an approximate browser preview from the currently selected Garmin device, hardware part number, and preview language. Generated Monkey C will use the selected `Graphics.FONT_*` constant directly and will not package a custom font resource for that element.

The first version deliberately excludes icons, weather fonts, radial text, angled text, scrollable text, and text nested inside complex elements.

## Goals

- Show the Garmin system fonts supported by the currently selected editor device.
- Preserve the actual Garmin constant selected by the user.
- Preview the font family, size, and baseline using the current device and preview language.
- Generate direct `Graphics.FONT_*` references without downloading or packaging font files.
- Keep all existing designs and custom-font workflows backward compatible.
- Make preview uncertainty explicit when Garmin uses a proprietary font unavailable to the browser.

## Non-goals

- Supporting radial, angled, or scrollable text.
- Supporting icons, weather fonts, or text nested inside sub-dials and other complex elements.
- Extracting or redistributing proprietary Garmin font files.
- Adding a backend font database or querying a local SDK at Studio runtime.
- Manually calibrating every supported device.
- Claiming pixel-identical real-device rendering.
- Simulating changes caused by a Garmin system text-size preference.
- Automatically replacing an unsupported system-font constant.
- Changing the default font of existing or newly created elements.

## Supported Elements

The following element types support system fonts in the first version:

- `time`
- `date`
- `text`
- `data`
- `label`
- `unit`

The data label and data unit are included because they share the same text-rendering contract as the data value. The `icon` element remains excluded.

## Design Data Model

System fonts are represented independently from normal font assets:

```json
{
  "fontSource": "system",
  "systemFont": "FONT_SMALL",
  "fontFamily": "roboto-condensed-regular",
  "fontSize": 36
}
```

### Field semantics

- A missing `fontSource`, or `fontSource: "asset"`, preserves the existing TrueType or bitmap font behavior.
- `fontSource: "system"` selects Garmin system-font rendering.
- `systemFont` must be a whitelisted constant extracted from the Garmin SDK, such as `FONT_SMALL` or `FONT_NUMBER_HOT`.
- Existing `fontFamily` and `fontSize` values remain stored as the element's last asset-font selection. They are ignored for system-font export and restored if the user switches back to an asset font.
- The application must not store a system-font constant in `fontFamily`. This prevents font download, membership, recent-font, character validation, and packaging code from treating it as a font asset.

Old design documents do not contain the new fields and retain their current behavior without migration.

## Resolution and Rendering Flow

Studio resolves a system-font preview from four inputs:

1. Current Garmin `deviceId`.
2. Current device `hardwarePartNumber` or `partNumber` when available.
3. Current editor preview language.
4. The saved `systemFont` constant.

The resolver returns:

- Whether the constant is supported by the target device and API level.
- The SDK-reported font face and size.
- The browser preview family.
- Preview metrics needed for Fabric layout and baseline positioning.
- A precision state: exact family, approximate family, or device-default mapping.

Changing device or preview language never rewrites `systemFont`. It only recomputes the preview.

The build pipeline validates the saved constant, excludes it from asset extraction, and emits a safe `Graphics.FONT_*` expression. Garmin then resolves the actual font for the target device and runtime language.

## Font Picker and Editor Interaction

The common font picker adds a `System fonts` section before recent and asset fonts. It shows only constants supported by the current device, ordered according to Garmin's standard order:

1. `FONT_XTINY`
2. `FONT_TINY`
3. `FONT_SMALL`
4. `FONT_MEDIUM`
5. `FONT_LARGE`
6. `FONT_NUMBER_MILD`
7. `FONT_NUMBER_MEDIUM`
8. `FONT_NUMBER_HOT`
9. `FONT_NUMBER_THAI_HOT`
10. Corresponding `FONT_SYSTEM_*` constants
11. `FONT_GLANCE`
12. `FONT_GLANCE_NUMBER`
13. Device-specific constants such as `FONT_AUX1` and `FONT_AUX2`

Each option displays the saved constant and its effective preview mapping, for example:

```text
FONT_SMALL
Roboto - 53 px
```

An approximate preview displays an information indicator with this explanation:

> Studio uses the closest available preview font. Verify the final appearance in Garmin Simulator.

When a system font is active:

- The picker displays the Garmin constant, not the substitute browser family.
- The font-size control is read-only and displays the resolved size with `System controlled`.
- The canvas immediately re-renders using the resolved family, size, and metrics.
- A language change re-resolves the family and metrics.
- A device change re-resolves the mapping if the constant is supported.
- An unsupported constant is retained but shown as an error and blocks export.
- Switching back to an asset font restores the retained `fontFamily` and `fontSize`.

System fonts are searchable by terms such as `small`, `number`, `glance`, and `system`. They never enter recent fonts, designer fonts, membership asset checks, font upload, or font download flows.

The time panel currently distinguishes TrueType and bitmap fonts. It will expose three sources:

- System
- TrueType
- Bitmap

The other five element types continue to use the common picker without an additional source tab.

## SDK Font Manifest

Production Studio does not read an installed Garmin SDK. A generation tool under `wristo-tools` produces a versioned, deterministic static manifest consumed by `wristo-studio`.

The generator reads:

- `doc/docs/Device_Reference/<deviceId>.html`
- `doc/Toybox/Graphics.html`

It extracts:

- Garmin SDK version.
- Device ID.
- Hardware part-number records.
- Supported languages.
- Font constant.
- Font face.
- Font size.
- Garmin internal font name.
- Minimum Connect IQ API level for the constant.

Generated records use stable ordering so regenerating from the same SDK creates no meaningless diff. The committed manifest includes its source SDK version. Development tooling warns when a newer configured SDK is detected, but production behavior never depends on a developer's local SDK installation.

### Device matching

Manifest records are resolved in this order:

1. Exact `hardwarePartNumber`.
2. Exact `partNumber`.
3. Default record for `deviceId`.

A device-default match is allowed and labeled `Preview mapping uses device default`. It does not block export because the target runtime still resolves the saved Garmin constant. Only an unsupported constant blocks export.

### Language matching

The resolver chooses among the SDK-reported faces using the current editor preview language and writing system:

- Latin and Cyrillic languages use the device's default Roboto, Roboto Condensed, or other declared default face.
- Simplified Chinese uses the device's Noto Sans SC mapping when declared.
- Japanese uses MotoyaLCedar or Kosugi when declared.
- Korean uses Nanum Gothic when declared.
- Thai uses Pridi or the device-declared Thai face.
- Number fonts use the device-declared Garmin, Chronos, Yantramanav, or other numeric face.

If the SDK table does not provide enough information for an exact locale-to-face match, the resolver uses the device default and marks the preview approximate. It must not present inferred mappings as exact.

`FONT_*` and `FONT_SYSTEM_*` remain separate saved options even when the current SDK maps them to the same face and size. This preserves user intent and avoids assuming future firmware or system-setting behavior.

## Browser Preview Fonts

Studio may bundle or load legally distributable browser fonts corresponding to SDK face names, including Roboto, Roboto Condensed, Noto Sans SC, Nanum Gothic, Kosugi, Pridi, and Yantramanav.

Garmin-specific faces, including Garmin and Chronos variants, use the closest available preview family. These mappings always carry the approximate precision state. The project must not copy font binaries from the Garmin SDK into Studio.

Fabric rendering uses the resolver's effective font size and metrics. Saved asset `fontSize` remains untouched. Baseline calculations must be refreshed when device, part number, preview language, or manifest mapping changes.

## Build Pipeline

The build normalizer accepts a system font only when all of these conditions hold:

- `fontSource` is exactly `system`.
- `systemFont` is in the generated Graphics constant whitelist.
- The target device and its supported API level accept the constant.
- The element type is one of the six supported types.

The normalizer produces a safe `systemFontLiteral`, for example:

```text
Graphics.FONT_SYSTEM_SMALL
```

The literal is derived from the whitelist and is never copied as an arbitrary expression from design JSON.

For system-font elements:

- Font asset extraction ignores `fontFamily` and `fontSize`.
- No font is downloaded, subsetted, converted, or added to resource XML.
- The generated element does not depend on the normal asset `fontId`.
- SuperAlpha supplies the system font object at the existing draw location.
- Runtime vertical positioning continues to use `dc.getFontAscent(font)`.

For `data`, `label`, and `unit`, system-font rendering bypasses the current custom-font content resolver and Chinese custom-font substitution. Garmin's system font handles the active runtime language. Asset-font behavior remains unchanged.

Plain text, date text, and other localized content retain their existing content and localization logic; only their final font object changes.

## Error Handling

- If the current target does not support the saved constant, Studio retains the value, displays an actionable error, and blocks export.
- If the manifest cannot provide an exact preview family but the target supports the constant, Studio allows export and labels the preview approximate.
- If a design contains an unknown or malformed system-font value, Studio retains the original data for recovery, displays an error, and does not silently downgrade it.
- If the device lacks a part-number match, Studio may use the device default mapping and identifies that fallback in the UI.
- Existing asset fonts, localized custom fonts, and bitmap time fonts keep their existing error behavior.

## Verification

### Studio data and UI tests

- All six supported element types preserve `fontSource` and `systemFont` through encode and decode.
- Switching between asset and system fonts retains and restores the asset family and size.
- Device, part-number, and preview-language changes recompute preview mappings.
- Unsupported constants enter an error state and block export.
- System fonts do not enter recent-font, membership, upload, or download paths.
- Time System, TrueType, and Bitmap modes do not overwrite one another.

### Manifest tests

- Parser tests use committed SDK HTML fixtures and do not depend on a local SDK.
- Fixtures cover multiple part numbers, multiple language faces, and minimum API levels.
- Forerunner 965 and Venu 3 have fixed expectations for English, Simplified Chinese, and number-font mappings.
- Manifest generation is deterministic and records the SDK version.

### Build tests

- System fonts do not appear in font downloads, subsets, or resource XML.
- Every supported element type generates the expected `Graphics.FONT_*` literal.
- Unknown constants cannot reach a Monkey C template.
- Existing design fixtures produce unchanged output.
- Existing asset-font, Chinese custom-font, and bitmap-time tests remain green.
- Representative AMOLED and MIP targets compile with the real Garmin SDK.

### Simulator calibration

A small calibration watch face renders all supported constants with representative content:

```text
Aa09:.-/
Time 12:48
Date Sun Aug 09
Chinese time and date samples
Data 12345 km
```

Studio and Garmin Simulator screenshots are compared for:

- Effective size.
- Text width.
- Baseline.
- Alignment.
- English and Simplified Chinese switching.

Calibration covers Forerunner 965, Venu 3, and one representative MIP device. Open browser fonts may receive metric adjustments based on this evidence. Proprietary Garmin fonts retain the approximate label; visual similarity is not reported as exact reconstruction.

## Completion Criteria

The feature is complete when all six supported element types can select a device-supported Garmin system font, Studio provides a device- and preview-language-aware rendering, the build uses validated Garmin font constants without packaging custom font assets, focused regression tests pass, representative AMOLED and MIP targets compile, and the selected representative devices have Simulator calibration evidence.

Browser tests, source tests, SDK compilation, Simulator behavior, and physical-device behavior are reported as separate proof boundaries. Simulator calibration does not prove physical-device pixel identity.
