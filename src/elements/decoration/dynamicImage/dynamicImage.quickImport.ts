import { nanoid } from 'nanoid'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import type { DynamicImageItem } from '@/types/elements/dynamicImage'

export type DynamicImageImportKind = 'minute' | 'hour24' | 'hour12' | 'weekday' | 'weather'

export interface DynamicImageImportFile {
  name: string
  file: File
  width: number
  height: number
}

export interface ParsedDynamicAssetFilename {
  kind: DynamicImageImportKind
  value?: number
  label?: string
  isDefault: boolean
}

export interface DynamicImageImportEntry extends ParsedDynamicAssetFilename {
  source: DynamicImageImportFile
  expression: string
}

export interface DynamicImageImportGroup {
  kind: DynamicImageImportKind
  tokenCode: string
  width: number
  height: number
  entries: DynamicImageImportEntry[]
}

export interface DynamicImageImportIssue {
  code: 'unrecognized-name' | 'duplicate-value' | 'out-of-range' | 'dimension-mismatch' | 'missing-values' | 'missing-default'
    | 'unsupported-file' | 'image-read-failed'
  kind?: DynamicImageImportKind
  fileName?: string
  value?: number
  values?: number[]
}

export interface CollectedDynamicImageImportFiles {
  files: DynamicImageImportFile[]
  errors: DynamicImageImportIssue[]
}

export interface MaterializedDynamicImageGroup {
  kind: DynamicImageImportKind
  width: number
  height: number
  items: DynamicImageItem[]
}

export interface DynamicImageImportPlan {
  groups: DynamicImageImportGroup[]
  errors: DynamicImageImportIssue[]
  warnings: DynamicImageImportIssue[]
}

interface KindDefinition {
  tokenCode: string
  minimum: number
  maximum: number
  requiresDefault?: boolean
}

const KIND_ORDER: DynamicImageImportKind[] = ['minute', 'hour24', 'hour12', 'weekday', 'weather']

export const DYNAMIC_IMAGE_IMPORT_KINDS: Readonly<Record<DynamicImageImportKind, KindDefinition>> = {
  minute: { tokenCode: 'tm8', minimum: 0, maximum: 59 },
  hour24: { tokenCode: 'tm6', minimum: 0, maximum: 23 },
  hour12: { tokenCode: 'tm7.3', minimum: 1, maximum: 12 },
  weekday: { tokenCode: 'tm5', minimum: 1, maximum: 7 },
  weather: { tokenCode: 'w01', minimum: 0, maximum: 13, requiresDefault: true },
}

const FILE_NAME_PATTERN = /^(minute|hour24|hour12|weekday|weather)-(default|\d{2})(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?\.(png|svg)$/

export function parseDynamicAssetFilename(fileName: string): ParsedDynamicAssetFilename | null {
  const baseName = fileName.split('/').at(-1) || fileName
  const match = FILE_NAME_PATTERN.exec(baseName)
  if (!match) return null
  const kind = match[1] as DynamicImageImportKind
  const isDefault = match[2] === 'default'
  return {
    kind,
    ...(isDefault ? {} : { value: Number(match[2]) }),
    ...(match[3] ? { label: match[3] } : {}),
    isDefault,
  }
}

function expectedValues(definition: KindDefinition): number[] {
  return Array.from(
    { length: definition.maximum - definition.minimum + 1 },
    (_, index) => definition.minimum + index,
  )
}

export function buildDynamicImageImportPlan(files: readonly DynamicImageImportFile[]): DynamicImageImportPlan {
  const errors: DynamicImageImportIssue[] = []
  const warnings: DynamicImageImportIssue[] = []
  const grouped = new Map<DynamicImageImportKind, DynamicImageImportEntry[]>()

  for (const source of files) {
    const parsed = parseDynamicAssetFilename(source.name)
    if (!parsed) {
      errors.push({ code: 'unrecognized-name', fileName: source.name })
      continue
    }
    const definition = DYNAMIC_IMAGE_IMPORT_KINDS[parsed.kind]
    if (!parsed.isDefault && (parsed.value! < definition.minimum || parsed.value! > definition.maximum)) {
      errors.push({ code: 'out-of-range', kind: parsed.kind, fileName: source.name, value: parsed.value })
      continue
    }
    const expression = parsed.isDefault ? 'true' : `(${definition.tokenCode}) == ${parsed.value}`
    const entries = grouped.get(parsed.kind) ?? []
    entries.push({ ...parsed, source, expression })
    grouped.set(parsed.kind, entries)
  }

  const groups: DynamicImageImportGroup[] = []
  for (const kind of KIND_ORDER) {
    const entries = grouped.get(kind)
    if (!entries?.length) continue
    const definition = DYNAMIC_IMAGE_IMPORT_KINDS[kind]
    const first = entries[0].source
    const seen = new Set<string>()
    for (const entry of entries) {
      const key = entry.isDefault ? 'default' : String(entry.value)
      if (seen.has(key)) errors.push({ code: 'duplicate-value', kind, fileName: entry.source.name, value: entry.value })
      else seen.add(key)
      if (entry.source.width !== first.width || entry.source.height !== first.height) {
        errors.push({ code: 'dimension-mismatch', kind, fileName: entry.source.name })
      }
    }
    const missing = expectedValues(definition).filter((value) => !seen.has(String(value)))
    if (missing.length) errors.push({ code: 'missing-values', kind, values: missing })
    if (definition.requiresDefault && !seen.has('default')) warnings.push({ code: 'missing-default', kind })
    entries.sort((left, right) => {
      if (left.isDefault) return 1
      if (right.isDefault) return -1
      return left.value! - right.value!
    })
    groups.push({ kind, tokenCode: definition.tokenCode, width: first.width, height: first.height, entries })
  }

  return { groups, errors, warnings }
}

type DimensionReader = (file: File) => Promise<{ width: number; height: number }>

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

function isSupportedImageName(name: string): boolean {
  return /\.(png|svg)$/i.test(name)
}

export async function collectDynamicImageImportFiles(
  inputs: readonly File[],
  options: { readDimensions?: DimensionReader } = {},
): Promise<CollectedDynamicImageImportFiles> {
  const readDimensions = options.readDimensions ?? readImageDimensions
  const candidates: File[] = []
  const errors: DynamicImageImportIssue[] = []

  for (const input of inputs) {
    if (!isSupportedImageName(input.name)) {
      errors.push({ code: 'unsupported-file', fileName: input.name })
      continue
    }
    candidates.push(input)
  }

  const files: DynamicImageImportFile[] = []
  for (const file of candidates) {
    try {
      const dimensions = await readDimensions(file)
      files.push({ name: file.name, file, ...dimensions })
    } catch {
      errors.push({ code: 'image-read-failed', fileName: file.name })
    }
  }
  return { files, errors }
}

export async function materializeDynamicImageImportGroups(
  groups: readonly DynamicImageImportGroup[],
  dependencies: {
    upload: (file: File) => Promise<{ assetId?: number; imageUrl: string }>
    createId?: (kind: DynamicImageImportKind, index: number) => string
  },
): Promise<MaterializedDynamicImageGroup[]> {
  const uploaded = new Map<DynamicImageImportEntry, { assetId?: number; imageUrl: string }>()
  for (const group of groups) {
    for (const entry of group.entries) uploaded.set(entry, await dependencies.upload(entry.source.file))
  }
  const createId = dependencies.createId ?? (() => nanoid())
  return groups.map((group) => ({
    kind: group.kind,
    width: group.width,
    height: group.height,
    items: group.entries.map((entry, index) => ({
      id: createId(group.kind, index),
      ...uploaded.get(entry)!,
      expression: parseExpression(entry.expression, DEFAULT_EXPRESSION_TOKEN_CATALOG),
    })),
  }))
}
