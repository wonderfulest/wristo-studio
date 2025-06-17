/**
 * RGB 转 HEX
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {string} 
 */
export const rgbToHex = (r, g, b) => {
    const toHex = (n) => {
      const hex = n.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return '#' + toHex(r) + toHex(g) + toHex(b)
}

/**
 * HEX 转 RGB
 * @param {string} hex 
 * @returns {object} 
 */
export const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
}

/**
 * 格式化颜色为 #000000 格式
 * @param {object} color 
 * @returns {string} 
 */
export const formatColorToHex = (color) => {
    return rgbToHex(color.r, color.g, color.b)
}

/**
 * 比较两个颜色,
 * 颜色格式为 #000000 格式 或 {r: 0, g: 0, b: 0} 格式 或 0x000000 格式
 * 
 * @param {string} color1 
 * @param {string} color2 
 * @returns {boolean} 
 */
export const compareColor = (color1, color2) => {
  // 将两个颜色值都转换为 RGB 对象格式
  const rgb1 = toRgbObject(color1)
  const rgb2 = toRgbObject(color2)
  
  // 比较 RGB 值
  return rgb1.r === rgb2.r && rgb1.g === rgb2.g && rgb1.b === rgb2.b
}

// 添加颜色转换辅助函数
function toRgbObject(color) {
  // 如果已经是 RGB 对象格式，直接返回
  if (typeof color === 'object' && color.r !== undefined && color.g !== undefined && color.b !== undefined) {
    return color
  }
  
  // 处理十六进制格式
  if (typeof color === 'string') {
    // 处理 0x 开头的十六进制格式
    if (color.startsWith('0x')) {
      color = color.substring(2)
    }
    // 处理 # 开头的十六进制格式
    if (color.startsWith('#')) {
      color = color.substring(1)
    }
    // 确保是 6 位十六进制数
    if (color.length === 3) {
      color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
    }
    const r = parseInt(color.substring(0, 2), 16)
    const g = parseInt(color.substring(2, 4), 16)
    const b = parseInt(color.substring(4, 6), 16)
    return { r, g, b }
  }
  
  // 如果无法转换，返回默认的黑色
  return { r: 0, g: 0, b: 0 }
}

/**
 * 解码颜色
 * @param {string|number} color 
 * @returns {string}  
 */
export const decodeColor = (color) => {
  if (typeof color === 'number') {
    if (color == -1) {
      return 'transparent'
    }
  }
  return color
}
