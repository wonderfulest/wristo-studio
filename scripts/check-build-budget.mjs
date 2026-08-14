import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const MIB = 1024 * 1024
const budgets = {
  js: 2.5 * MIB,
  css: 1.2 * MIB,
  font: 11 * MIB,
}

const assetsDir = resolve(process.cwd(), 'dist/assets')
const files = await readdir(assetsDir)
const violations = []

for (const file of files) {
  const extension = file.split('.').pop()?.toLowerCase()
  const budget = extension === 'js'
    ? budgets.js
    : extension === 'css'
      ? budgets.css
      : ['ttf', 'otf', 'woff', 'woff2'].includes(extension || '')
        ? budgets.font
        : undefined

  if (!budget) continue
  const { size } = await stat(resolve(assetsDir, file))
  if (size > budget) {
    violations.push(`${file}: ${(size / MIB).toFixed(2)} MiB exceeds ${(budget / MIB).toFixed(2)} MiB`)
  }
}

if (violations.length > 0) {
  console.error(`Bundle budget exceeded:\n${violations.map((item) => `- ${item}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log('Bundle budget passed')
}
