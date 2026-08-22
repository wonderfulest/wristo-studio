import { describe, expect, it } from 'vitest'
import {
  extractTimeHandsGroup,
  prepareCopiedTimeHandsConfigs,
} from './timeHands.copyModel'

const hand = (id: string, eleType: string, imageUrl = `${id}.svg`) => ({
  id,
  eleType,
  imageUrl,
  assetId: 1,
  left: 227,
  top: 227,
  originX: 'center',
  originY: 'center',
})

describe('extractTimeHandsGroup', () => {
  it('requires hour, minute, and second hands while keeping center cap optional', () => {
    const withoutCap = extractTimeHandsGroup({
      elements: [hand('hour', 'hourHand'), hand('minute', 'minuteHand'), hand('second', 'secondHand')],
      orderIds: ['hour', 'minute', 'second'],
    })

    expect(withoutCap.missingRequiredTypes).toEqual([])
    expect(withoutCap.elements.map(element => element.eleType)).toEqual([
      'hourHand',
      'minuteHand',
      'secondHand',
    ])

    const incomplete = extractTimeHandsGroup({
      elements: [hand('hour', 'hourHand'), hand('minute', 'minuteHand'), hand('cap', 'centerCap')],
    })
    expect(incomplete.missingRequiredTypes).toEqual(['secondHand'])
  })

  it('accepts serialized config and preserves the source layer order', () => {
    const group = extractTimeHandsGroup(JSON.stringify({
      elements: [
        hand('second', 'secondHand'),
        hand('cap', 'centerCap'),
        hand('hour', 'hourHand'),
        hand('minute', 'minuteHand'),
        hand('other', 'text'),
      ],
      orderIds: ['hour', 'minute', 'second', 'cap', 'other'],
    }))

    expect(group.missingRequiredTypes).toEqual([])
    expect(group.elements.map(element => element.id)).toEqual(['hour', 'minute', 'second', 'cap'])
  })
})

describe('prepareCopiedTimeHandsConfigs', () => {
  it('deep-clones source configs and assigns fresh ids', () => {
    const source = [
      {
        ...hand('hour', 'hourHand'),
        rotationCenter: { x: 220, y: 221 },
      },
      hand('minute', 'minuteHand'),
      hand('second', 'secondHand'),
    ]
    let nextId = 0

    const copied = prepareCopiedTimeHandsConfigs(source as any, () => `copy-${++nextId}`)

    expect(copied.map(element => element.id)).toEqual(['copy-1', 'copy-2', 'copy-3'])
    expect(copied[0]).toMatchObject({
      eleType: 'hourHand',
      imageUrl: 'hour.svg',
      rotationCenter: { x: 220, y: 221 },
    })
    expect(copied[0]).not.toBe(source[0])
    expect((copied[0] as any).rotationCenter).not.toBe((source[0] as any).rotationCenter)
  })
})
