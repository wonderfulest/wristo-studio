import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('global header dependency boundary', () => {
  it('keeps editor state and export dependencies out of non-editor navigation', () => {
    const source = readSource('./GlobalHeader.vue')

    expect(source).not.toContain("@/stores/baseStore")
    expect(source).not.toContain("@/stores/exportStore")
    expect(source).not.toContain("@/stores/historyStore")
    expect(source).toContain("router.push('/designs/new-projects')")
  })

  it('loads the editor header only for the design route', () => {
    const source = readSource('./Layout.vue')

    expect(source).toContain('<AppHeader v-if="isDesignPage" />')
    expect(source).toContain('<GlobalHeader v-else-if="!isAcademyPage" />')
    expect(source).toContain("defineAsyncComponent(() => import('./AppHeader.vue'))")
  })
})
