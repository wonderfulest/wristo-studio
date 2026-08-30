export interface TokenFormattingGuideItem {
  pattern: string
  defaultFormat: string
  descriptionKey: string
  input: string
  expression: string
  output: string
}

export const TOKEN_FORMATTING_GUIDE: readonly TokenFormattingGuideItem[] = [
  { pattern: '%s', defaultFormat: '%s', descriptionKey: 'tokens.guide.format.kind.string', input: 'Cloudy', expression: '(w02).format("%s")', output: 'Cloudy' },
  { pattern: '%d', defaultFormat: '%d', descriptionKey: 'tokens.guide.format.kind.integer', input: '7.25', expression: '(w03).format("%d")', output: '7' },
  { pattern: '%f', defaultFormat: '%f', descriptionKey: 'tokens.guide.format.kind.float', input: '7.25', expression: '(w03).format("%f")', output: '7.25' },
  { pattern: '%Wd / %Wf', defaultFormat: '%4d', descriptionKey: 'tokens.guide.format.kind.width', input: '42', expression: '(ai12).format("%4d")', output: '  42' },
  { pattern: '%0Wd / %0Wf', defaultFormat: '%06d', descriptionKey: 'tokens.guide.format.kind.zeroPad', input: '86400', expression: '(ds3.3).format("%06d")', output: '086400' },
  { pattern: '%.Pf', defaultFormat: '%.1f', descriptionKey: 'tokens.guide.format.kind.precision', input: '7.25', expression: '(w03).format("%.1f")', output: '7.3' },
  { pattern: '%W.Pf / %0W.Pf', defaultFormat: '%06.1f', descriptionKey: 'tokens.guide.format.kind.widthPrecision', input: '7.25', expression: '(w03).format("%06.1f")', output: '0007.3' },
  { pattern: '%,d / %,f / %,.Pf', defaultFormat: '%,d', descriptionKey: 'tokens.guide.format.kind.grouped', input: '12345', expression: '(ai12).format("%,d")', output: '12,345' },
  { pattern: '%,Wd / %,0Wd / %,W.Pf / %,0W.Pf', defaultFormat: '%,.1f', descriptionKey: 'tokens.guide.format.kind.groupedCombined', input: '12345', expression: '(ai12).format("%,.1f")', output: '12,345.0' }
]
