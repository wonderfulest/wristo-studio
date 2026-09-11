// Match emoji sequences without treating ordinary digits, #, or * as emoji.
export function stripDescriptionEmoji(text: string): string {
  return text.replace(
    /[#*0-9]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}](?:[\uFE0E\uFE0F\p{Emoji_Modifier}\u{E0020}-\u{E007F}]|\u200D[\p{Extended_Pictographic}\p{Regional_Indicator}])*/gu,
    '',
  )
}
