import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('production bundle optimization', () => {
  it('imports only the language subsets needed by each bundled Garmin preview font', () => {
    const stylesheet = readProjectFile('src/assets/styles/garmin-system-fonts.css')

    expect(stylesheet).not.toMatch(/@fontsource\/[\w-]+\/400\.css/)
    expect(stylesheet).toContain("@fontsource/roboto/latin-400.css")
    expect(stylesheet).toContain("@fontsource/kosugi/japanese-400.css")
    expect(stylesheet).toContain("@fontsource/nanum-gothic/korean-400.css")
    expect(stylesheet).toContain("@fontsource/pridi/thai-400.css")
    expect(stylesheet).toContain("@fontsource/yantramanav/devanagari-400.css")
  })

  it('loads the Markdown template editor asynchronously with its settings dialog', () => {
    const dialog = readProjectFile('src/components/dialogs/DesignerDefaultConfigDialog.vue')

    expect(dialog).toContain("defineAsyncComponent(() => import('@/components/inputs/TemplateTextEditor.vue'))")
    expect(dialog).not.toContain("import TemplateTextEditor from '@/components/inputs/TemplateTextEditor.vue'")
  })

  it('keeps only shared framework dependencies in stable cacheable chunks', () => {
    const viteConfig = readProjectFile('vite.config.ts')

    expect(viteConfig).toContain("'vue-vendor'")
    expect(viteConfig).toContain("'fabric'")
    expect(viteConfig).not.toContain("id.includes('node_modules/element-plus/')")
    expect(viteConfig).not.toContain("return 'markdown-editor'")
  })

  it('runs a bundle budget after every production build', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts?: Record<string, string> }

    expect(packageJson.scripts?.build).toContain('npm run build:budget')
    expect(packageJson.scripts?.['build:budget']).toBe('node scripts/check-build-budget.mjs')
  })

  it('provides a non-mutating lint quality gate', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts?: Record<string, string> }
    const eslintConfig = readProjectFile('eslint.config.mjs')

    expect(packageJson.scripts?.lint).toBe('eslint src vite.config.ts vitest.config.ts scripts --cache --max-warnings 0')
    expect(eslintConfig).toContain("pluginVue.configs['flat/essential']")
    expect(eslintConfig).toContain("'no-debugger': 'error'")
  })

  it('keeps editor-only plugins and preview fonts out of global startup', () => {
    const main = readProjectFile('src/main.ts')
    const router = readProjectFile('src/router/index.ts')
    const layout = readProjectFile('src/components/layout/Layout.vue')
    const userMenu = readProjectFile('src/components/layout/UserMenu.vue')

    expect(main).not.toContain("@/assets/styles/garmin-system-fonts.css")
    expect(main).not.toContain("@/engine/plugins")
    expect(router).toContain('beforeEnter: [ensureDesignDataCatalog, initializeEditorRuntime]')
    expect(layout).toContain("defineAsyncComponent(() => import('./AppMenu.vue'))")
    expect(layout).not.toContain("import AppMenu from './AppMenu.vue'")
    expect(userMenu).toContain("defineAsyncComponent(() => import('@/components/dialogs/DesignerDefaultConfigDialog.vue'))")
    expect(userMenu).not.toContain("import DesignerDefaultConfigDialog from '@/components/dialogs/DesignerDefaultConfigDialog.vue'")
  })

  it('resolves Element Plus components on demand instead of registering the full plugin', () => {
    const main = readProjectFile('src/main.ts')
    const viteConfig = readProjectFile('vite.config.ts')

    expect(main).not.toContain("import ElementPlus from 'element-plus'")
    expect(main).not.toContain('app.use(ElementPlus)')
    expect(main).not.toContain("element-plus/theme-chalk/src/index.scss")
    expect(viteConfig).toContain("import Components from 'unplugin-vue-components/vite'")
    expect(viteConfig).toContain('ElementPlusResolver')
  })

  it('uses the Vue Iconify component instead of the browser runtime at startup', () => {
    const main = readProjectFile('src/main.ts')
    const packageJson = JSON.parse(readProjectFile('package.json')) as { dependencies?: Record<string, string> }

    expect(main).toContain("import { Icon } from '@iconify/vue'")
    expect(main).not.toContain("import '@iconify/iconify'")
    expect(main).toContain("app.component('Icon', Icon)")
    expect(main).not.toContain("template: `<span class=\"iconify\"")
    expect(packageJson.dependencies?.['@iconify/iconify']).toBeUndefined()
  })
})
