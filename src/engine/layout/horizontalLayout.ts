import type { HorizontalLayoutOriginX } from '@/types/layoutGroup'

export interface MeasuredHorizontalLayoutMember {
  elementId: string
  width: number
  height: number
  participates: boolean
  gapBefore: number
  offsetY: number
}

export interface HorizontalLayoutInput {
  left: number
  top: number
  originX: HorizontalLayoutOriginX
  members: readonly MeasuredHorizontalLayoutMember[]
}

export interface PositionedHorizontalLayoutMember {
  elementId: string
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export interface HorizontalLayoutResult {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  members: PositionedHorizontalLayoutMember[]
}

const finiteOrZero = (value: unknown): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function layoutHorizontalGroup(input: HorizontalLayoutInput): HorizontalLayoutResult {
  const anchorX = finiteOrZero(input.left)
  const anchorY = finiteOrZero(input.top)
  const visibleMembers = input.members.filter((member) => (
    member.participates
    && Number.isFinite(member.width)
    && member.width > 0
  ))

  if (visibleMembers.length === 0) {
    return {
      left: anchorX,
      right: anchorX,
      top: anchorY,
      bottom: anchorY,
      width: 0,
      height: 0,
      members: [],
    }
  }

  const totalWidth = visibleMembers.reduce((sum, member, index) => (
    sum + member.width + (index === 0 ? 0 : finiteOrZero(member.gapBefore))
  ), 0)
  const startX = input.originX === 'right'
    ? anchorX - totalWidth
    : input.originX === 'center'
      ? anchorX - totalWidth / 2
      : anchorX

  let cursor = startX
  const members = visibleMembers.map((member, index): PositionedHorizontalLayoutMember => {
    if (index > 0) cursor += finiteOrZero(member.gapBefore)
    const width = member.width
    const height = Number.isFinite(member.height) && member.height > 0 ? member.height : 0
    const centerX = cursor + width / 2
    const centerY = anchorY + finiteOrZero(member.offsetY)
    const positioned = {
      elementId: member.elementId,
      left: cursor,
      right: cursor + width,
      top: centerY - height / 2,
      bottom: centerY + height / 2,
      width,
      height,
      centerX,
      centerY,
    }
    cursor += width
    return positioned
  })
  const top = Math.min(...members.map((member) => member.top))
  const bottom = Math.max(...members.map((member) => member.bottom))

  return {
    left: startX,
    right: startX + totalWidth,
    top,
    bottom,
    width: totalWidth,
    height: bottom - top,
    members,
  }
}
