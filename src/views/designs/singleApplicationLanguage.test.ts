import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const readSource = (relativePath: string) => readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8',
)

describe('single application language creation', () => {
  it('offers exactly English and Chinese and returns the selected metadata', () => {
    const source = readSource('./NewProjectDialog.vue')
    expect(source).toContain('<el-radio-button value="en">English</el-radio-button>')
    expect(source).toContain('<el-radio-button value="zh">中文</el-radio-button>')
    expect(source).toContain("emit('confirm', { name: localName.value, appLanguage: appLanguage.value })")
  })

  it('persists the selected metadata for blank and copied applications', () => {
    const source = readSource('./NewProjects.vue')
    expect(source.match(/configJson: withAppLanguage/g)).toHaveLength(2)
    expect(source).toContain('designStore.setAppLanguage(appLanguage)')
    expect(source).toContain("if (!copyUpdateRes || copyUpdateRes.code !== 0)")
  })
})
