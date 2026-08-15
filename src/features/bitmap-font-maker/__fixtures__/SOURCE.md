# Minimal Latin test font

`minimal-latin.ttf` is a test-only subset of the variable Noto Sans font from
the Google Fonts repository:

https://github.com/google/fonts/blob/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf

Downloaded on 2026-08-15 and subset with fonttools using:

```text
pyftsubset NotoSans.ttf --unicodes=U+0020-007E,U+00B0,U+2010,U+2013,U+2019,U+2026 \
  --layout-features=* --name-IDs=* --name-legacy --name-languages=* \
  --notdef-glyph --recommended-glyphs
```

The resulting fixture has SHA-256
`a9b93860e9f5568ff4edc14d1b30dee6a1b83f0c41f16d47f59715ab9824b71a`.

Noto Sans is distributed under the SIL Open Font License 1.1. The adjacent
`LICENSE.txt` is the license file from the same source directory.
