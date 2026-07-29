# Wristo Visual Theme System Design

## 1. Purpose

Wristo watch faces currently package one background and one hour, minute, and
second hand asset. This design adds install-time visual themes that users can
select from Garmin Connect IQ settings. One selection changes the coordinated
background, hand set, center cap, and theme-managed colors.

The first release establishes the reusable theme architecture while keeping the
feature surface deliberately narrow:

- Theme background
- Hour, minute, and optional second hand
- Optional center cap
- Existing Wristo color variables
- One user-selectable `Theme` setting

The first release does not change fonts, element positions, element visibility,
data fields, arbitrary decoration images, or layouts.

## 2. Architectural Decision

The system uses a base design plus theme overrides:

- `elements` remain the layout and rendering source of truth.
- `visualThemes` select alternate assets and color-variable values.
- The Studio preview resolves a selected theme over the base design.
- The Connect IQ package contains every published theme asset.
- The watch loads only the currently selected theme assets.

The existing backend `theme_rules` and `theme_configs` model is not the storage
model for packaged visual themes. It represents server-selected dynamic themes
using a rule key/value, one image, colors, priority, and weight. It cannot
represent a stable, ordered, packaged set of backgrounds, hands, and center
caps.

Packaged visual themes therefore live in the versioned design configuration and
travel with the `designUid`. Existing server-selected themes remain named
**Dynamic Theme Rules**. The new packaged feature is named **Visual Themes**.

In the first release Visual Themes and Dynamic Theme Rules are mutually
exclusive when both would control the background or colors. A later release may
allow a dynamic rule to select a packaged `visualThemeId`.

## 3. Design Configuration

The root design configuration gains an optional `visualThemes` object:

```json
{
  "visualThemes": {
    "version": 1,
    "enabled": true,
    "defaultThemeId": "classic",
    "selectionMode": "user",
    "themes": [
      {
        "id": "classic",
        "name": "Classic",
        "assets": {
          "background": {
            "assetId": 100,
            "imageUrl": "https://example.test/background.svg"
          },
          "hourHand": {
            "assetId": 101,
            "imageUrl": "https://example.test/hour.svg"
          },
          "minuteHand": {
            "assetId": 102,
            "imageUrl": "https://example.test/minute.svg"
          },
          "secondHand": {
            "assetId": 103,
            "imageUrl": "https://example.test/second.svg"
          },
          "centerCap": {
            "assetId": 104,
            "imageUrl": "https://example.test/cap.svg",
            "targetSize": 24
          }
        },
        "colors": {
          "PrimaryColor": "0xFFFFFF",
          "SecondaryColor": "0xAAAAAA",
          "AccentColor": "0xD32F2F",
          "BackgroundColor": "0x000000"
        },
        "fallbackHands": {
          "hourColor": "0xFFFFFF",
          "minuteColor": "0xFFFFFF",
          "secondColor": "0xFF0000"
        }
      }
    ]
  }
}
```

### 3.1 Root contract

- `version` is `1` for the initial schema.
- `enabled` controls packaging and settings generation without deleting saved
  theme definitions.
- `defaultThemeId` references exactly one existing theme.
- `selectionMode` is `user` in the first release.
- `themes` is ordered and contains between one and five themes.

### 3.2 Theme contract

- `id` is stable and unique. Renaming a theme does not change its ID.
- `name` is non-empty, unique within the design, and no longer than 24
  characters.
- `hourHand` and `minuteHand` are required.
- `background`, `secondHand`, and `centerCap` are optional.
- An asset reference contains a persistent `assetId` and durable original file
  URL. A browser-local `blob:` URL is never a valid packaged source.
- `centerCap.targetSize` retains the existing center-cap size contract.
- `colors` may contain only existing color-property keys whose `themeMode` is
  `theme`.
- `fallbackHands` configures colors for devices that cannot render rotated
  bitmap hands.

### 3.3 Asset resolution

For each theme slot:

```text
theme asset -> corresponding base element asset -> omit the drawable
```

Studio warns when a theme relies on a base fallback. Hour and minute hand
validation remains strict: packaging fails if neither the theme nor the base
element provides the required asset.

## 4. Color Variables

The feature reuses the existing Wristo color-property system. It does not add a
parallel token system.

Each color property gains an optional `themeMode`:

```json
{
  "PrimaryColor": {
    "type": "color",
    "title": "Primary Color",
    "value": "0xFFFFFF",
    "themeMode": "theme"
  },
  "CustomDataColor": {
    "type": "color",
    "title": "Custom Data Color",
    "value": "0x00FF00",
    "themeMode": "user"
  }
}
```

- `theme`: the current Visual Theme supplies the value. The property is not
  emitted as an independent Garmin color setting.
- `user`: the Garmin property continues to control the value and Visual Themes
  cannot override it.
- Missing `themeMode` means `user`, preserving existing designs.

Existing element bindings such as `colorProperty`, `fillProperty`,
`strokeProperty`, and `borderColorProperty` remain unchanged.

Theme-managed color resolution is:

```text
current theme value -> color-property default -> element fixed color
```

User-managed color resolution is:

```text
Garmin property value -> color-property default -> element fixed color
```

## 5. Studio Experience

Visual Themes are edited in a global panel rather than in an individual
background or hand settings panel.

### 5.1 Theme list

The list supports:

- Add
- Duplicate
- Rename
- Delete
- Reorder
- Set as default
- Select for preview

Duplicating a theme copies its assets and colors but creates a new stable ID.
The default theme cannot be deleted until another theme becomes the default.

Studio keeps `previewThemeId` as editor-only state. Changing the preview theme
does not mutate `defaultThemeId`.

### 5.2 Theme editor

The Assets section contains pickers for:

- Background
- Hour hand
- Minute hand
- Second hand
- Center cap

Hand pickers must retain the original SVG/file URL and persistent `assetId`,
not only a generated preview URL.

The Colors section lists existing properties whose `type` is `color` and whose
`themeMode` is `theme`. It does not define a separate hard-coded palette.

The Fallback section configures the three geometric fallback hand colors.

### 5.3 Preview resolver

The canvas preview applies the current theme without overwriting base elements:

1. Resolve the theme background and hand assets.
2. Resolve theme-managed color-property values.
3. Render using the existing element geometry and ordering.
4. Restore or switch cleanly when `previewThemeId` changes.

### 5.4 Enabling and disabling

Enabling Visual Themes on a legacy design:

1. Creates one default theme.
2. References the current background, hands, and center cap.
3. Leaves base elements unchanged.
4. Leaves all existing color properties in `user` mode.

Disabling Visual Themes retains the saved theme definitions but packages only
the default/base presentation and omits the Garmin Theme setting.

## 6. Persistence and API Boundary

The design JSON is the source of truth for packaged themes. The API must:

- Preserve `visualThemes` during design save, copy, fetch, and packaging fetch.
- Preserve `themeMode` on color properties.
- Validate persistent asset references.
- Treat analog assets as globally deactivatable, not physically deletable.
- Hide inactive analog assets from new Studio selections while preserving
  ID-based fetch and packaging for historical design snapshots.
- Allow an administrator to reactivate an analog asset only through an
  explicit active-state update.
- Return the same configuration for a given saved design snapshot.

No new Visual Theme database tables are required in the first release.
Existing `theme_configs` is unchanged.

## 7. Export and Asset Bundles

Studio export must:

- Include the complete `visualThemes` object.
- Include every referenced theme `assetId` in the design asset bundle.
- Reject unresolved `blob:` references.
- Validate unique theme IDs and names.
- Validate the default theme reference.
- Validate theme count and required hand slots.
- Validate all theme color keys and RGB565-compatible values.
- Reject theme overrides of `themeMode=user` properties.

Legacy designs without `visualThemes` keep the existing export format.

## 8. Connect IQ Packaging

The scaffold converts theme assets into deterministic resources:

```text
theme0Background.png
theme0HourHand.png
theme0MinuteHand.png
theme0SecondHand.png
theme0CenterCap.png
theme1Background.png
theme1HourHand.png
...
```

Display names are never used in filenames. The scaffold creates a stable
package-local `themeId -> numeric index` mapping from theme order.

The shared analog hand and center-cap scripts gain an explicit output-name
argument. They remain the only conversion path for both legacy and themed
assets. Generated copies are not hand-edited.

The scaffold generates:

- Theme drawables
- Theme strings
- Theme setting entries
- Default numeric theme index
- Per-theme asset-presence flags
- Theme-managed color constants
- Fallback hand colors

The package build fails with a precise theme ID and slot when conversion fails.

## 9. Garmin Settings

The existing `Theme` property becomes the packaged Visual Theme selector:

```xml
<property id="Theme" type="number">0</property>
```

When Visual Themes are enabled and more than one theme exists, generated
settings contain:

```xml
<setting propertyKey="@Properties.Theme" title="@Strings.VisualThemeTitle">
  <settingConfig type="list">
    <listEntry value="0">@Strings.VisualTheme0Name</listEntry>
    <listEntry value="1">@Strings.VisualTheme1Name</listEntry>
  </settingConfig>
</setting>
```

One enabled theme does not need a visible selector.

Garmin persists a numeric value. Published products should append new themes
rather than reorder existing themes. An out-of-range saved value falls back to
the configured default index.

## 10. Monkey C Runtime

The runtime stores the active theme index, current theme resources, and
generated fixed color variables. It does not load all theme bitmaps at startup.

```text
onLayout
  -> read and validate Theme
  -> loadVisualTheme
  -> initialize draw options

onSettingsChanged
  -> read Theme
  -> return when unchanged
  -> release old resource references
  -> load selected resources and colors
  -> rebuild color-dependent draw options
  -> request update
```

Generated `switch` branches load the correct static resources. Existing hand
draw code continues to use the single active `hourHand`, `minuteHand`,
`secondHand`, and `centerCap` variables.

Fixed generated variables are preferred to a runtime color Dictionary to reduce
Monkey C memory overhead.

Runtime fallback order is:

```text
saved numeric index -> default theme -> first valid theme -> legacy base assets
```

## 11. Low-Power and Low-End Devices

- Devices supporting `AffineTransform` render the selected bitmap hands.
- Unsupported devices retain the current geometric hand fallback and use the
  selected theme's fallback colors.
- Fallback geometry is not expected to reproduce each bitmap shape.
- Missing second hands remain absent.
- Existing AOD and burn-in rules continue to suppress or simplify second-hand
  rendering.
- Missing center caps remain absent rather than creating an implicit cap.

The first release does not add per-theme AOD assets. AOD continues to use the
existing low-power rendering path and protections.

## 12. Dynamic Theme Rule Interaction

The first release has one explicit ownership rule:

```text
Visual Themes enabled -> Dynamic Theme Rules cannot control background/colors
```

Studio blocks or disables the conflicting combination and explains why. If
Studio cannot verify the Dynamic Theme Rule state, it fails closed and does not
enable Visual Themes. Deactivation remains available so an operator can always
resolve the conflict.

A future selection-policy extension may support:

- `user`
- `automatic`
- `automatic_with_user_override`

In that model a Dynamic Theme Rule selects an existing stable
`visualThemeId`; it does not send an unrelated background and color payload.

## 13. Compatibility

Designs without `visualThemes`:

- Keep current Studio behavior.
- Keep current resource names and packaging path.
- Do not emit a Theme selector.
- Do not gain additional package size.

Designs with disabled Visual Themes retain their definitions but package one
presentation.

The schema is versioned so future AOD, font, icon-set, visibility, and layout
overrides can be added without changing the version-1 contract.

## 14. Validation and Error Handling

Studio save and packaging reject:

- Missing or duplicate theme IDs
- Empty or duplicate names
- Missing default theme
- More than five themes
- Missing required hour/minute hand after fallback resolution
- Browser-local asset URLs without persistent IDs
- Unknown color-property keys
- Overrides of user-managed colors
- Invalid color values
- Failed asset download or conversion

Runtime never trusts the persisted numeric index and always applies the fallback
chain.

## 15. Verification

### Studio

- Enable a legacy design and create the initial theme.
- Add, duplicate, rename, delete, reorder, and default themes.
- Verify preview selection does not change the default.
- Verify background, hands, cap, and colors switch together.
- Verify user-managed colors do not change.
- Verify save/reopen and design copy preserve all theme data.
- Verify original SVG URLs and asset IDs survive selection and export.

### API and design snapshots

- Round-trip `visualThemes` and `themeMode`.
- Preserve theme data when copying a design.
- Deactivate analog assets without deleting rows or stored files.
- Hide inactive assets from new selection while retaining historical get and
  packaging resolution by ID.
- Reactivate inactive assets only through an explicit administrator update.
- Return a reproducible snapshot for packaging.

### Scaffold

- Preserve the legacy single-theme output.
- Generate unique resources for multiple themes.
- Convert both SVG and raster hand inputs.
- Handle optional background, second hand, and cap slots.
- Generate matching drawable, property, setting, and string resources.
- Report the exact theme and slot on failures.

### Connect IQ

- Use the default theme on first install.
- Show generated theme names.
- Switch all assets and theme-managed colors together.
- Avoid reloading when the selected index is unchanged.
- Fall back safely for an invalid saved index.
- Preserve AOD behavior.
- Use theme fallback colors on devices without bitmap transforms.
- Keep inactive theme bitmaps out of active runtime references.

## 16. Delivery Phases

### Phase 1

- Version-1 `visualThemes` contract
- Studio theme manager and preview
- Background, hand set, and center-cap slots
- Existing color variables with `themeMode`
- Generated Garmin Theme selector
- Lazy runtime theme loading
- Dynamic-rule conflict guard
- Legacy compatibility

### Phase 2

- Tick and foreground-overlay slots
- Per-theme AOD assets
- Package-size estimates
- Dynamic rule selection by stable `visualThemeId`

### Phase 3

- Icon sets
- Fonts
- Element visibility
- Layout variants

## 17. Acceptance Criteria

The first release is complete when a designer can create two or more Visual
Themes in Studio, save and reopen the design, package it, install it, and use
Garmin Connect IQ settings to switch background, hour/minute/second hands,
center cap, and theme-managed existing color variables as one coordinated
theme, while legacy designs and low-power behavior remain unchanged.
