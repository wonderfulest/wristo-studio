// 字体加载优化
const loadedFonts = new Set()

/**
 * 优化字体加载
 * @param {string} url 字体URL
 * @returns {Promise} 加载完成的Promise
 */
export const loadFont = async (url) => {
  if (loadedFonts.has(url)) {
    return
  }

  try {
    const font = new FontFace('CustomFont', `url(${url})`, {
      display: 'swap',
      loading: 'eager'
    })

    // 预加载字体
    await font.load()
    document.fonts.add(font)
    loadedFonts.add(url)
  } catch (error) {
    console.warn('Font loading failed:', error)
  }
}
