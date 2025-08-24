import { defineStore } from 'pinia'
import { getFontBySlug, getFonts, getSystemFonts } from '@/api/wristo/fonts'
import { ApiResponse } from '@/types/api'
import { DesignFontVO } from '@/types/font'

// Types
export interface FontOption {
  label: string
  value: string
  family: string
  // Optional: source URL for remote/custom font file (e.g., TTF)
  src?: string
  // Optional: the alias family actually registered for rendering
  alias?: string
}

interface FontSectionsState {
  recent: boolean
  condensed: boolean
  'sans-serif': boolean
  fixed: boolean
  serif: boolean
  lcd: boolean
  icon: boolean
  custom: boolean
}

export interface FontStoreState {
  fonts: unknown[]
  loading: boolean
  error: string | null
  loadedFonts: Set<string>
  allFontsLoaded: boolean
  recentFonts: FontOption[]
  expandedSections: Record<string, boolean>
  // builtin fonts are now grouped dynamically by subfamily
  // key: subfamily (e.g., Regular, Bold, etc.) or 'custom'
  builtinFonts: Record<string, FontOption[]>
  serverFonts: Map<string, DesignFontVO>
  loadingFonts: Set<string>
}

// 初始为空，启动后通过 getSystemFonts 动态填充
const BUILTIN_FONTS: FontStoreState['builtinFonts'] = {}

export const useFontStore = defineStore<'fontStore', FontStoreState, {
  // getters
  allFonts(state: FontStoreState): FontOption[]
  fontSections(state: FontStoreState): Array<{ label: string; name: string; fonts: FontOption[] }>
  getFontLabel(state: FontStoreState): (value: string) => string
  isBuiltinFont(state: FontStoreState): (fontName: string) => boolean
}, {
  // actions
  initBuiltinFontsFromSystem(): Promise<void>
  fetchFonts(): Promise<void>
  loadFont(slug: string): Promise<boolean>
  loadFonts(fontNames: string[]): Promise<boolean>
  loadFontsForElements(elements: Array<any>): Promise<boolean>
  loadSystemFonts(): Promise<DesignFontVO[]>
  addRecentFont(font: FontOption): void
  addCustomFont(font: FontOption): void
  toggleSection(sectionName: keyof FontSectionsState | string): void
  searchFonts(query: string): FontOption[]
}>(
  'fontStore',
  {
    state: (): FontStoreState => ({
      fonts: [],
      loading: false,
      error: null,
      loadedFonts: new Set<string>(), // Track which fonts have been loaded
      allFontsLoaded: false, // Track if all required fonts are loaded
      recentFonts: [], // Track recently used fonts
      // 字体分类展开状态（动态：按 subfamily 分组）
      expandedSections: { recent: true, custom: false },
      // 动态分组后的字体
      builtinFonts: BUILTIN_FONTS,
      // 存储从服务器加载的字体
      serverFonts: new Map<string, DesignFontVO>(), // 字体名称 -> 字体信息的映射
      loadingFonts: new Set<string>(), // 正在加载的字体名称集合
    }),

    getters: {
      // 获取所有字体选项
      allFonts: (state): FontOption[] => {
        return Object.values(state.builtinFonts).flat()
      },

      // 获取字体分类列表（动态：subfamily 分组）
      fontSections: (state) => {
        const sections: Array<{ label: string; name: string; fonts: FontOption[] }> = []
        sections.push({ label: 'Recent', name: 'recent', fonts: state.recentFonts })
        const keys = Object.keys(state.builtinFonts).filter(k => k !== 'custom')
        // 稳定排序，'Regular' 置前
        keys.sort((a, b) => {
          if (a === 'Regular') return -1
          if (b === 'Regular') return 1
          return a.localeCompare(b)
        })
        for (const key of keys) {
          sections.push({ label: key, name: key, fonts: state.builtinFonts[key] })
        }
        if (state.builtinFonts.custom?.length) {
          sections.push({ label: 'Custom Fonts', name: 'custom', fonts: state.builtinFonts.custom })
        }
        return sections
      },

      // 根据字体值获取字体标签
      getFontLabel: (state) => (value: string): string => {
        const font = (state as any).allFonts.find((f: FontOption) => f.value === value)
        return font ? font.label : value
      },

      // 检查字体是否为内置字体
      isBuiltinFont: (state) => (fontName: string): boolean => {
        return (state as any).allFonts.some((font: FontOption) => font.value === fontName)
      }
    },

    actions: {
      /**
       * 加载系统字体分页，并为每个字体以 slug 注册 FontFace 供预览/渲染
       * @param query 搜索关键词（匹配 fullName/family/slug，忽略大小写）
       * @returns { items, total }
       */
      async loadSystemFonts(): Promise<DesignFontVO[]> {
        console.log('加载系统字体')
        const response: ApiResponse<DesignFontVO[]> = await getSystemFonts()
        const pageItems = (response.data ?? []) as DesignFontVO[]
        // 以 slug 为别名注册字体，绑定 ttf 文件
        const tasks: Promise<void>[] = []
        pageItems.forEach((font) => {
          const rawUrl: string | undefined = (font as any)?.ttfFile?.url
          if (!rawUrl || !font.slug) return
          const url = rawUrl.startsWith('http') ? rawUrl : `${location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
          const alias = `${font.slug}`
          const task = (async () => {
            try {
              const face = new FontFace(alias, `url(${url})`)
              console.log('注册字体:', alias, url)
              await face.load()
              ;(document as any).fonts.add(face)
              try { await (document as any).fonts.load(`1rem "${alias}"`) } catch {}
              ;(font as any).previewFamily = alias
              this.loadedFonts.add(alias)
            } catch (err) {
              console.error('字体加载失败:', font?.fullName || font?.family || font?.slug, err)
            }
          })()
          tasks.push(task)
        })
        await Promise.all(tasks)

        return pageItems
      },
      // 初始化：从系统字体加载，按 subfamily 分组
      async initBuiltinFontsFromSystem(): Promise<void> {
        try {
          const res: any = await getSystemFonts()
          const list: Array<any> = res?.data ?? []
          const groups: Record<string, FontOption[]> = {}
          for (const f of list) {
            const subfamily = f.subfamily || 'Others'
            const label = f.fullName || f.family || f.postscriptName || f.slug
            const family = f.family || f.fullName || f.postscriptName || f.slug
            const value = f.slug || family
            const option: FontOption = { label, value, family }
            if (!groups[subfamily]) groups[subfamily] = []
            groups[subfamily].push(option)
          }
          // 自定义字体分组保留
          const custom = this.builtinFonts.custom || []
          this.builtinFonts = { ...groups, ...(custom.length ? { custom } : {}) }
        } catch (e) {
          console.error('Failed to init builtin fonts from system:', e)
        }
      },

      async fetchFonts() {
        try {
          this.loading = true
          const response: any = await getFonts({
            pageNum: 1,
            pageSize: 20
          })
          // Some APIs return { data: { data: [...] } }, others { data: [...] }
          this.fonts = response?.data?.data ?? response?.data ?? []
          this.error = null
          // 懒加载系统内置字体（仅首次）
          if (!Object.keys(this.builtinFonts).length) {
            await this.initBuiltinFontsFromSystem()
          }
        } catch (err: any) {
          this.error = err?.message ?? String(err)
        } finally {
          this.loading = false
        }
      },

      /**
       * 加载字体
       * @param {string} slug - 字体名称
       * @returns {Promise<boolean>} 加载是否成功
       */
      async loadFont(slug: string): Promise<boolean> {
        console.log('加载字体:', slug)
        if (!slug) return false

        // 如果字体已加载，直接返回
        if (this.loadedFonts.has(slug)) {
          return true
        }

        // 如果是内置字体，直接标记为已加载
        if (this.isBuiltinFont(slug)) {
          this.loadedFonts.add(slug)
          return true
        }

        // 如果字体正在加载中，等待加载完成
        if (this.loadingFonts.has(slug)) {
          while (this.loadingFonts.has(slug)) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          return this.loadedFonts.has(slug)
        }

        try {
          this.loadingFonts.add(slug)

          // 如果已经获取过字体信息，直接使用
          let fontInfo = this.serverFonts.get(slug)
          
          // 否则从服务器获取字体信息
          if (!fontInfo) {
            const response: ApiResponse<DesignFontVO> = await getFontBySlug(slug)
            console.log('获取字体信息:', response)
            fontInfo = response?.data 
            if (!fontInfo) {
              console.warn(`No attributes for font: ${slug}`)
              return false
            }
            this.serverFonts.set(slug, fontInfo)
          }

          // 检查字体文件URL是否存在
          const ttfUrl = fontInfo.ttfFile?.url
          if (!ttfUrl) {
            console.warn('Missing ttfFile.url in server response, cannot auto-register font', slug)
            return false
          }

          // 加载字体
          const fontFace = new FontFace(slug, `url(${ttfUrl})`)
          await fontFace.load()
          ;(document as any).fonts.add(fontFace)
          
          // 等待字体实际可用
          await (document as any).fonts.ready
          
          // 再次确认字体是否可用
          const isAvailable = (document as any).fonts.check(`12px ${slug}`)
          if (isAvailable) {
            this.loadedFonts.add(slug)
            return true
          }
          return false
        } catch (error) {
          console.error(`Failed to load font ${slug}:`, error)
          return false
        } finally {
          this.loadingFonts.delete(slug)
        }
      },

      /**
       * 加载多个字体
       * @param {Array<string>} fontNames - 字体名称数组
       * @returns {Promise<boolean>} 是否全部加载成功
       */
      async loadFonts(fontNames: string[]): Promise<boolean> {
        if (!fontNames || fontNames.length === 0) return true

        try {
          const results = await Promise.all(
            fontNames.map(name => this.loadFont(name))
          )
          return results.every(result => result)
        } catch (error) {
          console.error('Failed to load fonts:', error)
          return false
        }
      },

      /**
       * 加载元素所需的字体
       * @param {Array<Object>} elements - 元素数组
       * @returns {Promise<boolean>} 是否全部加载成功
       */
      async loadFontsForElements(elements: Array<any>): Promise<boolean> {
        console.log('加载元素所需的字体:', elements)
        this.loadFonts([])
        if (!elements || elements.length === 0) return true

        const fontNames = new Set<string>()
        
        elements.forEach((element: any) => {
          // 处理组元素
          if (element._objects) {
            element._objects.forEach((obj: any) => {
              if (obj.fontFamily) fontNames.add(obj.fontFamily as string)
            })
          }
          // 处理单个元素
          if (element.fontFamily) fontNames.add(element.fontFamily as string)
          // 处理配置中的字体
          if (element.font) fontNames.add(element.font as string)
        })

        return this.loadFonts(Array.from(fontNames))
      },

      // 添加最近使用的字体
      addRecentFont(font: FontOption) {
        if (!font || !font.value) return

        // 从现有列表中移除这个字体（如果存在）
        const index = this.recentFonts.findIndex((f) => f.value === font.value)
        if (index > -1) {
          this.recentFonts.splice(index, 1)
        }

        // 添加到列表开头
        this.recentFonts.unshift(font)

        // 只保留最近的 5 个字体
        if (this.recentFonts.length > 5) {
          this.recentFonts.pop()
        }
      },

      // 添加自定义字体
      addCustomFont(font: FontOption) {
        if (font?.src) {
          // 当提供了 src，使用唯一别名注册，确保渲染使用上传的 TTF
          const fontFamily = font.value || font.family || font.label
          try {
            const face = new FontFace(fontFamily, `url(${font.src})`)
            // 立即加载并注册
            face.load().then(() => {
              ;(document as any).fonts.add(face)
              this.loadedFonts.add(fontFamily)
            }).catch((e) => {
              console.warn('Failed to load custom font alias:', fontFamily, e)
            })
            // 将用于渲染的值替换为别名，但分组仍沿用原 family
            font = { ...font, value: fontFamily }
          } catch (e) {
            console.warn('Register custom font alias error:', e)
          }
        }

        // 确保存在 custom 分组
        if (!this.builtinFonts.custom) this.builtinFonts.custom = []
        const existingIndex = this.builtinFonts.custom.findIndex((f) => f.value === font.value)
        if (existingIndex !== -1) {
          this.builtinFonts.custom[existingIndex] = font
        } else {
          this.builtinFonts.custom.push(font)
        }
        // 自动添加到最近使用
        this.addRecentFont(font)
      },

      // 切换分类展开状态（支持动态分组名）
      toggleSection(sectionName: keyof FontSectionsState | string) {
        this.expandedSections[sectionName] = !this.expandedSections[sectionName]
      },

      // 搜索字体
      searchFonts(query: string): FontOption[] {
        if (!query) return []

        const q = query.toLowerCase()
        return (this as any).allFonts.filter((font: FontOption) =>
          font.label.toLowerCase().includes(q) || font.family.toLowerCase().includes(q)
        )
      }
    }
  }
)
