import { describe, expect, it } from 'vitest'
import { stripDescriptionEmoji } from './garminDescription'

describe('stripDescriptionEmoji', () => {
  it('removes emoji including joined, skin tone, flag and keycap sequences', () => {
    expect(stripDescriptionEmoji('⭐⌚❤️👩🏽‍💻🇨🇳1️⃣')).toBe('')
  })

  it('preserves multilingual text, numbers, punctuation, links and line breaks', () => {
    const text = 'FEATURES 24/7 #1 * 36号 • 日期\nhttps://wristo.io/?id=123\n中文 日本語'
    expect(stripDescriptionEmoji(text)).toBe(text)
    expect(stripDescriptionEmoji('⭐ FEATURES\n❤️ Heart rate')).toBe(' FEATURES\n Heart rate')
  })
})
