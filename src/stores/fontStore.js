import { defineStore } from 'pinia'
import { getFonts } from '@/api/fonts'

// 将所有字体数组定义在 store 外部
const BUILTIN_FONTS = {
  icon: [
    { label: 'Qiwei One', value: 'Qiwei-One', family: 'Qiwei-One' },
    { label: 'Qiwei Two', value: 'Qiwei-Two', family: 'Qiwei-Two' },
    { label: 'Yoghurt One', value: 'Yoghurt-One', family: 'Yoghurt-One' },
    { label: 'SuperIcons', value: 'SuperIcons', family: 'SuperIcons' },
  ],
  lcd: [
    {
      label: 'Digital System',
      value: 'DigitalSystem-Regular',
      family: 'Digital System'
    },
    { label: 'Minisystem', value: 'Minisystem-Regular', family: 'Minisystem' },
    {
      label: 'Patopian 1986',
      value: 'Patopian1986-Regular',
      family: 'Patopian 1986'
    }
  ],
  condensed: [
    {
      label: 'Roboto Condensed Black',
      value: 'RobotoCondensed-Black',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Black Italic',
      value: 'RobotoCondensed-BlackItalic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Bold',
      value: 'RobotoCondensed-Bold',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Bold Italic',
      value: 'RobotoCondensed-BoldItalic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed ExtraBold',
      value: 'RobotoCondensed-ExtraBold',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed ExtraBold Italic',
      value: 'RobotoCondensed-ExtraBoldItalic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed ExtraLight',
      value: 'RobotoCondensed-ExtraLight',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed ExtraLight Italic',
      value: 'RobotoCondensed-ExtraLightItalic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Italic',
      value: 'RobotoCondensed-Italic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Light',
      value: 'RobotoCondensed-Light',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Light Italic',
      value: 'RobotoCondensed-LightItalic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Medium',
      value: 'RobotoCondensed-Medium',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Medium Italic',
      value: 'RobotoCondensed-MediumItalic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Regular',
      value: 'RobotoCondensed-Regular',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed SemiBold',
      value: 'RobotoCondensed-SemiBold',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed SemiBold Italic',
      value: 'RobotoCondensed-SemiBoldItalic',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Thin',
      value: 'RobotoCondensed-Thin',
      family: 'Roboto Condensed'
    },
    {
      label: 'Roboto Condensed Thin Italic',
      value: 'RobotoCondensed-ThinItalic',
      family: 'Roboto Condensed'
    },

    // IBM Plex Sans Condensed Fonts
    {
      label: 'IBM Plex Sans Condensed Regular',
      value: 'IBMPlexSansCondensed-Regular',
      family: 'IBM Plex Sans Condensed'
    },
    {
      label: 'IBM Plex Sans Condensed Medium',
      value: 'IBMPlexSansCondensed-Medium',
      family: 'IBM Plex Sans Condensed'
    },
    {
      label: 'IBM Plex Sans Condensed SemiBold',
      value: 'IBMPlexSansCondensed-SemiBold',
      family: 'IBM Plex Sans Condensed'
    },
    {
      label: 'IBM Plex Sans Condensed Bold',
      value: 'IBMPlexSansCondensed-Bold',
      family: 'IBM Plex Sans Condensed'
    },

    // Roboto Semi Condensed Fonts
    {
      label: 'Roboto Semi Condensed Black',
      value: 'RobotoSemiCondensed-Black',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Black Italic',
      value: 'RobotoSemiCondensed-BlackItalic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Bold',
      value: 'RobotoSemiCondensed-Bold',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Bold Italic',
      value: 'RobotoSemiCondensed-BoldItalic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed ExtraBold',
      value: 'RobotoSemiCondensed-ExtraBold',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed ExtraBold Italic',
      value: 'RobotoSemiCondensed-ExtraBoldItalic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed ExtraLight',
      value: 'RobotoSemiCondensed-ExtraLight',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed ExtraLight Italic',
      value: 'RobotoSemiCondensed-ExtraLightItalic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Italic',
      value: 'RobotoSemiCondensed-Italic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Light',
      value: 'RobotoSemiCondensed-Light',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Light Italic',
      value: 'RobotoSemiCondensed-LightItalic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Medium',
      value: 'RobotoSemiCondensed-Medium',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Medium Italic',
      value: 'RobotoSemiCondensed-MediumItalic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Regular',
      value: 'RobotoSemiCondensed-Regular',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed SemiBold',
      value: 'RobotoSemiCondensed-SemiBold',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed SemiBold Italic',
      value: 'RobotoSemiCondensed-SemiBoldItalic',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Thin',
      value: 'RobotoSemiCondensed-Thin',
      family: 'Roboto Semi Condensed'
    },
    {
      label: 'Roboto Semi Condensed Thin Italic',
      value: 'RobotoSemiCondensed-ThinItalic',
      family: 'Roboto Semi Condensed'
    }
  ],
  sansSerif: [
    // Amiko Fonts
    { label: 'Amiko Regular', value: 'Amiko-Regular', family: 'Amiko' },
    { label: 'Amiko SemiBold', value: 'Amiko-SemiBold', family: 'Amiko' },
    { label: 'Amiko Bold', value: 'Amiko-Bold', family: 'Amiko' },
    // Arimo Fonts
    { label: 'Arimo Regular', value: 'Arimo-Regular', family: 'Arimo' },
    { label: 'Arimo Bold', value: 'Arimo-Bold', family: 'Arimo' },
    { label: 'Bebas Neue Bold', value: 'BebasNeue-Bold', family: 'Bebas Neue' },
    { label: 'Bebas Neue Book', value: 'BebasNeue-Book', family: 'Bebas Neue' },
    { label: 'Bebas Neue Light', value: 'BebasNeue-Light', family: 'Bebas Neue' },
    {
      label: 'Bebas Neue Regular',
      value: 'BebasNeue-Regular',
      family: 'Bebas Neue'
    },
    { label: 'Bebas Neue Thin', value: 'BebasNeue-Thin', family: 'Bebas Neue' },

    // LLDEtechno Fonts
    { label: 'LLDEtechnoGlitch Bold 0', value: 'LLDEtechnoGlitch-Bold0', family: 'LLDEtechnoGlitch' },
    { label: 'LLDEtechnoGlitch Bold 100', value: 'LLDEtechnoGlitch-Bold100', family: 'LLDEtechnoGlitch' },
    { label: 'LLDEtechnoGlitch Bold Italic 0', value: 'LLDEtechnoGlitch-BoldItalic0', family: 'LLDEtechnoGlitch' },
    { label: 'LLDEtechnoGlitch Bold Italic 100', value: 'LLDEtechnoGlitch-BoldItalic100', family: 'LLDEtechnoGlitch' },
    { label: 'LLDEtechnoGlitch GX', value: 'LLDEtechnoGlitch', family: 'LLDEtechnoGlitch' },
    { label: 'LLDEtechnoTwist Bold 0', value: 'LLDEtechnoTwist-Bold0', family: 'LLDEtechnoTwist' },
    { label: 'LLDEtechnoTwist Bold 100', value: 'LLDEtechnoTwist-Bold100', family: 'LLDEtechnoTwist' },
    { label: 'LLDEtechnoTwist Bold Italic 0', value: 'LLDEtechnoTwist-BoldItalic0', family: 'LLDEtechnoTwist' },
    { label: 'LLDEtechnoTwist Bold Italic 100', value: 'LLDEtechnoTwist-BoldItalic100', family: 'LLDEtechnoTwist' },
    { label: 'LLDEtechnoTwist GX', value: 'LLDEtechnoTwist', family: 'LLDEtechnoTwist' },

    // Montserrat Fonts
    {
      label: 'Montserrat Regular',
      value: 'Montserrat-Regular',
      family: 'Montserrat'
    },
    {
      label: 'Montserrat Medium',
      value: 'Montserrat-Medium',
      family: 'Montserrat'
    },
    { label: 'Montserrat Bold', value: 'Montserrat-Bold', family: 'Montserrat' },
    { label: 'Muli Regular', value: 'Muli-Regular', family: 'Muli' },
    { label: 'Muli SemiBold', value: 'Muli-SemiBold', family: 'Muli' },
    { label: 'Muli Bold', value: 'Muli-Bold', family: 'Muli' },
    { label: 'Muli ExtraBold', value: 'Muli-ExtraBold', family: 'Muli' },
    { label: 'Muli Black', value: 'Muli-Black', family: 'Muli' },
    { label: 'Nunito Regular', value: 'Nunito-Regular', family: 'Nunito' },
    { label: 'Nunito SemiBold', value: 'Nunito-SemiBold', family: 'Nunito' },
    { label: 'Nunito Bold', value: 'Nunito-Bold', family: 'Nunito' },
    { label: 'Nunito ExtraBold', value: 'Nunito-ExtraBold', family: 'Nunito' },
    { label: 'Nunito Black', value: 'Nunito-Black', family: 'Nunito' },
    { label: 'Overpass Regular', value: 'Overpass-Regular', family: 'Overpass' },
    {
      label: 'Overpass SemiBold',
      value: 'Overpass-SemiBold',
      family: 'Overpass'
    },
    { label: 'Overpass Bold', value: 'Overpass-Bold', family: 'Overpass' },
    {
      label: 'Overpass ExtraBold',
      value: 'Overpass-ExtraBold',
      family: 'Overpass'
    },
    { label: 'Overpass Black', value: 'Overpass-Black', family: 'Overpass' },
    {
      label: 'Work Sans Regular',
      value: 'WorkSans-Regular',
      family: 'Work Sans'
    },
    { label: 'Work Sans Medium', value: 'WorkSans-Medium', family: 'Work Sans' },
    { label: 'Work Sans Bold', value: 'WorkSans-Bold', family: 'Work Sans' },
    {
      label: 'Work Sans ExtraBold',
      value: 'WorkSans-ExtraBold',
      family: 'Work Sans'
    },
    { label: 'Work Sans Black', value: 'WorkSans-Black', family: 'Work Sans' },
    { label: 'Super Comic', value: 'Super-Comic', family: 'Super-Comic' }
  ],
  fixedWidth:  [
    { label: 'Apple Classic', value: 'Apple-Classic', family: 'Apple Classic' },
    { label: 'Apple Curved', value: 'Apple-Curved', family: 'Apple Curved' },
    {
      label: 'Apple Curved Thin',
      value: 'Apple-Curved-Thin',
      family: 'Apple Curved'
    },
    {
      label: 'Apple Curved UltraThin',
      value: 'Apple-Curved-UltraThin',
      family: 'Apple Curved'
    },
    { label: 'Apple Modern', value: 'Apple-Modern', family: 'Apple Modern' },
    {
      label: 'Apple Modern Thin',
      value: 'Apple-Modern-Thin',
      family: 'Apple Modern'
    },
    { label: 'Cousine Regular', value: 'Cousine-Regular', family: 'Cousine' },
    { label: 'Cousine Bold', value: 'Cousine-Bold', family: 'Cousine' },
    {
      label: 'IBM Plex Mono Regular',
      value: 'IBMPlexMono-Regular',
      family: 'IBM Plex Mono'
    },
    {
      label: 'IBM Plex Mono Medium',
      value: 'IBMPlexMono-Medium',
      family: 'IBM Plex Mono'
    },
    {
      label: 'IBM Plex Mono SemiBold',
      value: 'IBMPlexMono-SemiBold',
      family: 'IBM Plex Mono'
    },
    {
      label: 'IBM Plex Mono Bold',
      value: 'IBMPlexMono-Bold',
      family: 'IBM Plex Mono'
    },
    {
      label: 'Inconsolata Regular',
      value: 'Inconsolata-Regular',
      family: 'Inconsolata'
    },
    {
      label: 'Inconsolata Bold',
      value: 'Inconsolata-Bold',
      family: 'Inconsolata'
    },
    {
      label: 'Overpass Mono Regular',
      value: 'OverpassMono-Regular',
      family: 'Overpass Mono'
    },
    {
      label: 'Overpass Mono SemiBold',
      value: 'OverpassMono-SemiBold',
      family: 'Overpass Mono'
    },
    {
      label: 'Overpass Mono Bold',
      value: 'OverpassMono-Bold',
      family: 'Overpass Mono'
    },
  
    {
      label: 'Roboto Mono Regular',
      value: 'RobotoMono-Regular',
      family: 'Roboto Mono'
    },
    {
      label: 'Roboto Mono Medium',
      value: 'RobotoMono-Medium',
      family: 'Roboto Mono'
    },
    {
      label: 'Roboto Mono Bold',
      value: 'RobotoMono-Bold',
      family: 'Roboto Mono'
    },
    {
      label: 'Roboto Slab Regular',
      value: 'RobotoSlab-Regular',
      family: 'Roboto Slab'
    },
    {
      label: 'Roboto Slab Bold',
      value: 'RobotoSlab-Bold',
      family: 'Roboto Slab'
    },
  
    {
      label: 'Source Code Pro Regular',
      value: 'SourceCodePro-Regular',
      family: 'Source Code Pro'
    },
    {
      label: 'Source Code Pro Medium',
      value: 'SourceCodePro-Medium',
      family: 'Source Code Pro'
    },
    {
      label: 'Source Code Pro SemiBold',
      value: 'SourceCodePro-SemiBold',
      family: 'Source Code Pro'
    },
    {
      label: 'Source Code Pro Bold',
      value: 'SourceCodePro-Bold',
      family: 'Source Code Pro'
    },
    {
      label: 'Source Code Pro Black',
      value: 'SourceCodePro-Black',
      family: 'Source Code Pro'
    },
    {
      label: 'Ubuntu Mono Regular',
      value: 'UbuntuMono-Regular',
      family: 'Ubuntu Mono'
    },
    {
      label: 'Ubuntu Mono Bold',
      value: 'UbuntuMono-Bold',
      family: 'Ubuntu Mono'
    }
  ],
  serif: [
    { label: 'Aleo Regular', value: 'Aleo-Regular', family: 'Aleo' },
    { label: 'Aleo Bold', value: 'Aleo-Bold', family: 'Aleo' },
    { label: 'Arvo Regular', value: 'Arvo-Regular', family: 'Arvo' },
    { label: 'Arvo Bold', value: 'Arvo-Bold', family: 'Arvo' },
    { label: 'BioRhyme Regular', value: 'BioRhyme-Regular', family: 'BioRhyme' },
    { label: 'BioRhyme Bold', value: 'BioRhyme-Bold', family: 'BioRhyme' },
    {
      label: 'BioRhyme ExtraBold',
      value: 'BioRhyme-ExtraBold',
      family: 'BioRhyme'
    },
    { label: 'Bitter Regular', value: 'Bitter-Regular', family: 'Bitter' },
    { label: 'Bitter Bold', value: 'Bitter-Bold', family: 'Bitter' },
    { label: 'Glegoo Regular', value: 'Glegoo-Regular', family: 'Glegoo' },
    { label: 'Glegoo Bold', value: 'Glegoo-Bold', family: 'Glegoo' },
    { label: 'Kadwa Regular', value: 'Kadwa-Regular', family: 'Kadwa' },
    { label: 'Kadwa Bold', value: 'Kadwa-Bold', family: 'Kadwa' },
    { label: 'Kameron Regular', value: 'Kameron-Regular', family: 'Kameron' },
    { label: 'Kameron Bold', value: 'Kameron-Bold', family: 'Kameron' },
    {
      label: 'Libre Baskerville Regular',
      value: 'LibreBaskerville-Regular',
      family: 'Libre Baskerville'
    },
    {
      label: 'Libre Baskerville Bold',
      value: 'LibreBaskerville-Bold',
      family: 'Libre Baskerville'
    },
    {
      label: 'Noto Serif Regular',
      value: 'NotoSerif-Regular',
      family: 'Noto Serif'
    },
    { label: 'Noto Serif Bold', value: 'NotoSerif-Bold', family: 'Noto Serif' },
    {
      label: 'Roboto Slab Regular',
      value: 'RobotoSlab-Regular',
      family: 'Roboto Slab'
    },
    {
      label: 'Roboto Slab Bold',
      value: 'RobotoSlab-Bold',
      family: 'Roboto Slab'
    },
    { label: 'Sumana Regular', value: 'Sumana-Regular', family: 'Sumana' },
    { label: 'Sumana Bold', value: 'Sumana-Bold', family: 'Sumana' }
  ],
  custom: [
    { label: 'conthrax-sb', value: 'conthrax-sb', family: 'conthrax-sb' },
    { label: 'VarsityTeam-Bold', value: 'VarsityTeam-Bold', family: 'VarsityTeam' }
  ]
}

export const useFontStore = defineStore('fontStore', {
  state: () => ({
    fonts: [],
    loading: false,
    error: null,
    loadedFonts: new Set(), // Track which fonts have been loaded
    allFontsLoaded: false, // Track if all required fonts are loaded
    recentFonts: [], // Track recently used fonts
    // 字体分类展开状态
    expandedSections: {
      recent: true,
      condensed: true,
      'sans-serif': true,
      fixed: true,
      serif: false,
      lcd: true,
      icon: true,
      custom: false
    },
    // 使用预定义的字体列表
    builtinFonts: BUILTIN_FONTS,
    // 存储从服务器加载的字体
    serverFonts: new Map(), // 字体名称 -> 字体信息的映射
    loadingFonts: new Set(), // 正在加载的字体名称集合
  }),

  getters: {
    // 获取所有字体选项
    allFonts: (state) => {
      return Object.values(state.builtinFonts).flat()
    },

    // 获取字体分类列表
    fontSections: (state) => [
      { label: '最近使用', name: 'recent', fonts: state.recentFonts },
      { label: '窄体字体', name: 'condensed', fonts: state.builtinFonts.condensed },
      { label: '无衬线字体', name: 'sans-serif', fonts: state.builtinFonts.sansSerif },
      { label: '等宽字体', name: 'fixed', fonts: state.builtinFonts.fixedWidth },
      { label: '衬线字体', name: 'serif', fonts: state.builtinFonts.serif },
      { label: 'LCD字体', name: 'lcd', fonts: state.builtinFonts.lcd },
      { label: '图标字体', name: 'icon', fonts: state.builtinFonts.icon },
      { label: '自定义字体', name: 'custom', fonts: state.builtinFonts.custom }
    ],

    // 根据字体值获取字体标签
    getFontLabel: (state) => (value) => {
      const font = state.allFonts.find((f) => f.value === value)
      return font ? font.label : value
    },

    // 检查字体是否为内置字体
    isBuiltinFont: (state) => (fontName) => {
      return state.allFonts.some(font => font.value === fontName)
    }
  },

  actions: {
    async fetchFonts() {
      try {
        this.loading = true
        const response = await getFonts()
        this.fonts = response.data.data
        this.error = null
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * 加载字体
     * @param {string} fontName - 字体名称
     * @returns {Promise<boolean>} 加载是否成功
     */
    async loadFont(fontName) {
      if (!fontName) return false

      // 如果字体已加载，直接返回
      if (this.loadedFonts.has(fontName)) {
        return true
      }

      // 如果是内置字体，直接标记为已加载
      if (this.isBuiltinFont(fontName)) {
        this.loadedFonts.add(fontName)
        return true
      }

      // 如果字体正在加载中，等待加载完成
      if (this.loadingFonts.has(fontName)) {
        while (this.loadingFonts.has(fontName)) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        return this.loadedFonts.has(fontName)
      }

      try {
        this.loadingFonts.add(fontName)

        // 如果已经获取过字体信息，直接使用
        let fontInfo = this.serverFonts.get(fontName)
        
        // 否则从服务器获取字体信息
        if (!fontInfo) {
          const response = await getFonts({
            name: fontName,
            // status: 'Approved'
          })
          
          if (!response.data || response.data.length === 0) {
            console.warn(`Font not found: ${fontName}`)
            return false
          }
          
          fontInfo = response.data[0].attributes
          this.serverFonts.set(fontName, fontInfo)
        }

        // 检查字体文件URL是否存在
        const ttfUrl = fontInfo.ttf?.data?.attributes?.url
        if (!ttfUrl) {
          console.warn(`No TTF file for font: ${fontName}`)
          return false
        }

        // 加载字体
        const fontFace = new FontFace(fontName, `url(${ttfUrl})`)
        await fontFace.load()
        document.fonts.add(fontFace)
        
        // 等待字体实际可用
        await document.fonts.ready
        
        // 再次确认字体是否可用
        const isAvailable = document.fonts.check(`12px ${fontName}`)
        if (isAvailable) {
          this.loadedFonts.add(fontName)
          return true
        }
        
        return false
      } catch (error) {
        console.error(`Failed to load font ${fontName}:`, error)
        return false
      } finally {
        this.loadingFonts.delete(fontName)
      }
    },

    /**
     * 加载多个字体
     * @param {Array<string>} fontNames - 字体名称数组
     * @returns {Promise<boolean>} 是否全部加载成功
     */
    async loadFonts(fontNames) {
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
    async loadFontsForElements(elements) {
      if (!elements || elements.length === 0) return true

      const fontNames = new Set()
      
      elements.forEach(element => {
        // 处理组元素
        if (element._objects) {
          element._objects.forEach(obj => {
            if (obj.fontFamily) fontNames.add(obj.fontFamily)
          })
        }
        // 处理单个元素
        if (element.fontFamily) fontNames.add(element.fontFamily)
        // 处理配置中的字体
        if (element.font) fontNames.add(element.font)
      })

      return this.loadFonts(Array.from(fontNames))
    },

    // 添加最近使用的字体
    addRecentFont(font) {
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
    addCustomFont(font) {
      const existingIndex = this.builtinFonts.custom.findIndex((f) => f.value === font.value)
      if (existingIndex !== -1) {
        this.builtinFonts.custom[existingIndex] = font
      } else {
        this.builtinFonts.custom.push(font)
      }
      // 自动添加到最近使用
      this.addRecentFont(font)
    },

    // 切换分类展开状态
    toggleSection(sectionName) {
      this.expandedSections[sectionName] = !this.expandedSections[sectionName]
    },

    // 搜索字体
    searchFonts(query) {
      if (!query) return []

      query = query.toLowerCase()
      return this.allFonts.filter((font) => font.label.toLowerCase().includes(query) || font.family.toLowerCase().includes(query))
    }
  }
})
