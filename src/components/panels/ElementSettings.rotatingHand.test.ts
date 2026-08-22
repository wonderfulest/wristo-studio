import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('ElementSettings rotating hand calibration', () => {
  it('keeps calibration active when selecting another rotating hand', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/panels/ElementSettings.vue'), 'utf8')
    expect(source).toContain("['hourHand', 'minuteHand', 'secondHand', 'rotatingHand'].includes(type)")
  })
})
