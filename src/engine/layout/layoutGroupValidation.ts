import type { AnyElementConfig } from '@/types/elements'
import {
  isHorizontalLayoutElementType,
  type HorizontalLayoutGroupConfig,
  type HorizontalLayoutMemberConfig,
  type HorizontalLayoutOriginX,
  type LayoutGroupBinding,
} from '@/types/layoutGroup'

export interface LayoutGroupValidationIssue {
  path: string
  code: string
  message: string
}

export class LayoutGroupValidationError extends Error {
  readonly issues: LayoutGroupValidationIssue[]

  constructor(issues: LayoutGroupValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
    this.name = 'LayoutGroupValidationError'
    this.issues = issues
  }
}

const recordOf = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
)

const normalizeNumber = (value: unknown): number => Number(value)

export function normalizeLayoutGroups(input: unknown): HorizontalLayoutGroupConfig[] {
  if (input == null) return []
  const groups = Array.isArray(input) ? input : []
  return groups.map((rawGroup, groupIndex) => {
    const group = recordOf(rawGroup)
    const rawMembers = Array.isArray(group.members) ? group.members : []
    const members: HorizontalLayoutMemberConfig[] = rawMembers.map((rawMember) => {
      const member = recordOf(rawMember)
      return {
        elementId: String(member.elementId ?? '').trim(),
        gapBefore: normalizeNumber(member.gapBefore ?? 0),
        offsetY: normalizeNumber(member.offsetY ?? 0),
      }
    })
    const name = String(group.name ?? '').trim()
    const rawBinding = recordOf(group.binding)
    const propertyKey = String(rawBinding.propertyKey ?? '').trim()
    const binding = propertyKey
      ? { kind: String(rawBinding.kind ?? '') as LayoutGroupBinding['kind'], propertyKey }
      : undefined
    return {
      id: String(group.id ?? '').trim(),
      name: name || `Layout Group ${groupIndex + 1}`,
      direction: String(group.direction ?? 'horizontal') as 'horizontal',
      left: normalizeNumber(group.left),
      top: normalizeNumber(group.top),
      originX: String(group.originX ?? 'center') as HorizontalLayoutOriginX,
      ...(binding ? { binding } : {}),
      members,
    }
  })
}

const issue = (path: string, code: string, message: string): LayoutGroupValidationIssue => ({
  path,
  code,
  message,
})

export function validateLayoutGroups(
  groupsInput: unknown,
  elements: readonly AnyElementConfig[],
): LayoutGroupValidationIssue[] {
  if (groupsInput == null) return []
  if (!Array.isArray(groupsInput)) {
    return [issue('layoutGroups', 'invalid_type', 'must be an array')]
  }

  const groups = normalizeLayoutGroups(groupsInput)
  const elementById = new Map(elements
    .filter((element) => (element as any)?.id != null)
    .map((element) => [String((element as any).id), element]))
  const groupIds = new Set<string>()
  const memberOwners = new Map<string, { groupId: string; groupIndex: number }>()
  const issues: LayoutGroupValidationIssue[] = []

  groups.forEach((group, groupIndex) => {
    const groupPath = `layoutGroups[${groupIndex}]`
    if (!group.id) {
      issues.push(issue(`${groupPath}.id`, 'required', 'must be non-empty'))
    } else if (groupIds.has(group.id)) {
      issues.push(issue(`${groupPath}.id`, 'duplicate', `duplicates layout group id "${group.id}"`))
    } else {
      groupIds.add(group.id)
    }
    if (group.direction !== 'horizontal') {
      issues.push(issue(`${groupPath}.direction`, 'unsupported', 'must be "horizontal"'))
    }
    if (!['left', 'center', 'right'].includes(group.originX)) {
      issues.push(issue(`${groupPath}.originX`, 'invalid', 'must be left, center, or right'))
    }
    if (group.binding && !['data', 'goal'].includes(group.binding.kind)) {
      issues.push(issue(`${groupPath}.binding.kind`, 'invalid', 'must be data or goal'))
    }
    for (const field of ['left', 'top'] as const) {
      if (!Number.isFinite(group[field])) {
        issues.push(issue(`${groupPath}.${field}`, 'invalid_number', 'must be a finite number'))
      }
    }
    if (group.members.length < 2) {
      issues.push(issue(`${groupPath}.members`, 'too_few_members', 'must contain at least two members'))
    }

    const localMembers = new Set<string>()
    group.members.forEach((member, memberIndex) => {
      const memberPath = `${groupPath}.members[${memberIndex}]`
      const element = elementById.get(member.elementId)
      if (!member.elementId) {
        issues.push(issue(`${memberPath}.elementId`, 'required', 'must be non-empty'))
      } else if (!element) {
        issues.push(issue(`${memberPath}.elementId`, 'missing_element', `references missing element "${member.elementId}"`))
      } else if (!isHorizontalLayoutElementType((element as any).eleType ?? (element as any).type)) {
        issues.push(issue(`${memberPath}.elementId`, 'unsupported_element_type', `references unsupported element "${member.elementId}"`))
      }

      if (localMembers.has(member.elementId)) {
        issues.push(issue(`${memberPath}.elementId`, 'duplicate_member', `duplicates member "${member.elementId}" in this group`))
      } else {
        localMembers.add(member.elementId)
      }
      const owner = memberOwners.get(member.elementId)
      if (owner && owner.groupIndex !== groupIndex) {
        issues.push(issue(`${memberPath}.elementId`, 'multiple_groups', `already belongs to layout group "${owner.groupId}"`))
      } else if (member.elementId) {
        memberOwners.set(member.elementId, { groupId: group.id, groupIndex })
      }

      for (const field of ['gapBefore', 'offsetY'] as const) {
        if (!Number.isFinite(member[field])) {
          issues.push(issue(`${memberPath}.${field}`, 'invalid_number', 'must be a finite number'))
        }
      }
    })
  })

  return issues
}

export function normalizeAndValidateLayoutGroups(
  input: unknown,
  elements: readonly AnyElementConfig[],
): HorizontalLayoutGroupConfig[] {
  const groups = normalizeLayoutGroups(input)
  const issues = validateLayoutGroups(input, elements)
  if (issues.length > 0) throw new LayoutGroupValidationError(issues)
  return groups
}
