import { defineStore } from 'pinia'

export const usePropertiesStore = defineStore('properties', {
  state: () => ({
    properties: {},
    defaultColorOptions: [
      { label: 'White', value: '0xFFFFFF' },
      { label: 'Dark Gray', value: '0x555555' },
      { label: 'Light Gray', value: '0xAAAAAA' },
      { label: 'Yellow', value: '0xFFFF00' },
      { label: 'Lime', value: '0xAAFF00' },
      { label: 'Bright Green', value: '0x55FF00' },
      { label: 'Green', value: '0x00FF00' },
      { label: 'Spring Green', value: '0x00FF55' },
      { label: 'Bright Aquamarine', value: '0x00FFAA' },
      { label: 'Cyan', value: '0x00FFFF' },
      { label: 'Azure', value: '0x00AAFF' },
      { label: 'Denim Blue', value: '0x0055FF' },
      { label: 'Blue', value: '0x0000FF' },
      { label: 'Electric Indigo', value: '0x5500FF' },
      { label: 'Violet', value: '0xAA00FF' },
      { label: 'Magenta', value: '0xFF00FF' },
      { label: 'Pink', value: '0xFF00AA' },
      { label: 'Torch Red', value: '0xFF0055' },
      { label: 'Red', value: '0xFF0000' },
      { label: 'Strong Orange', value: '0xFF5500' },
      { label: 'Orange', value: '0xFFAA00' },
      { label: 'Olive Green', value: '0xAAAA55' },
      { label: 'Fruit Salad', value: '0x55AA55' },
      { label: 'Tradewind Blue', value: '0x55AAAA' },
      { label: 'Rich Blue', value: '0x5555AA' },
      { label: 'Tapestry Purple', value: '0xAA55AA' },
      { label: 'Blossom Red', value: '0xAA5555' },
      { label: 'Lemon', value: '0xFFFF55' },
      { label: 'Green Yellow', value: '0xAAFF55' },
      { label: 'Screamin Green', value: '0x55FF55' },
      { label: 'Aquamarine', value: '0x55FFAA' },
      { label: 'Baby Blue', value: '0x55FFFF' },
      { label: 'Maya Blue', value: '0x55AAFF' },
      { label: 'Neon Blue', value: '0x5555FF' },
      { label: 'Pale Violet', value: '0xAA55FF' },
      { label: 'Flamingo', value: '0xFF55FF' },
      { label: 'Brilliant Rose', value: '0xFF55AA' },
      { label: 'Tomato', value: '0xFF5555' },
      { label: 'Pale Orange', value: '0xFFAA55' },
      { label: 'Canary', value: '0xFFFFAA' },
      { label: 'Mint', value: '0xAAFFAA' },
      { label: 'Pale Blue', value: '0xAAFFFF' },
      { label: 'Lavender', value: '0xAAAAFF' },
      { label: 'Rose', value: '0xFFAAFF' },
      { label: 'Lilac', value: '0xFFAAAA' },
      { label: 'Citrus', value: '0xAAAA00' },
      { label: 'Limeade', value: '0x55AA00' },
      { label: 'Dark Green', value: '0x00AA00' },
      { label: 'Green Haze', value: '0x00AA55' },
      { label: 'Persian Green', value: '0x00AAAA' },
      { label: 'Cobalt', value: '0x0055AA' },
      { label: 'Dark Blue', value: '0x0000AA' },
      { label: 'Purple', value: '0x5500AA' },
      { label: 'Dark Magenta', value: '0xAA00AA' },
      { label: 'Lipstick', value: '0xAA0055' },
      { label: 'Dark Red', value: '0xAA0000' },
      { label: 'Tawny Orange', value: '0xAA5500' },
      { label: 'Verdun Green', value: '0x555500' },
      { label: 'Darkest Green', value: '0x005500' },
      { label: 'Sherpa Blue', value: '0x005555' },
      { label: 'Navy Blue', value: '0x000055' },
      { label: 'Tyrian Purple', value: '0x550055' },
      { label: 'Maroon', value: '0x550000' },
      { label: 'Black', value: '0x000000' },
      { label: 'Transparent', value: '-1' }
    ]
  }),

  getters: {
    allProperties: (state) => state.properties || {},
    
    getPropertyValue: (state) => (key) => state.properties[key]?.value,
    
    getDefaultValue: () => (type) => {
      switch (type) {
        case 'color':
          return '0xffffff'
        case 'number':
          return 0
        case 'string':
          return ''
        case 'boolean':
          return false
        case 'date':
          return new Date().toISOString()
        case 'select':
          return ''
        case 'goal':
          return ''
        case 'data':
          return ''
        default:
          return ''
      }
    },

    // 获取颜色属性的默认选项
    getDefaultColorOptions: (state) => state.defaultColorOptions,

    // 验证颜色值是否有效
    isValidColorValue: () => (value) => {
      if (value === '-1') return true // 支持透明色
      return /^0x[0-9A-Fa-f]{6}$/.test(value)
    }
  },

  actions: {
    loadProperties(properties) {
      this.properties = properties || {}
    },

    addProperty(propertyData) {
      console.log('Adding property:', propertyData)
      const defaultValue = propertyData.defaultValue !== undefined ? propertyData.defaultValue : 
                          this.properties[propertyData.key]?.value || 
                          propertyData.options[0]?.value || 
                          this.getDefaultValue(propertyData.type)
      
      this.properties[propertyData.key] = {
        type: propertyData.type,
        title: propertyData.title,
        options: propertyData.options,
        value: defaultValue,
        prompt: propertyData.prompt,
        errorMessage: propertyData.errorMessage
      }
      console.log('Added property:', this.properties[propertyData.key])
    },

    editProperty(key, propertyData) {
      if (this.properties[key]) {
        this.properties[key] = {
          ...this.properties[key],
          ...propertyData,
          value: propertyData.defaultValue || 
                 this.properties[key].value || 
                 propertyData.options[0]?.value || 
                 this.getDefaultValue(propertyData.type)
        }
      }
    },

    deleteProperty(key) {
      if (this.properties[key]) {
        delete this.properties[key]
      }
    },

    setPropertyValue(key, value) {
      if (this.properties[key]) {
        this.properties[key].value = value
      }
    },

    // 添加颜色选项
    addColorOption(key, option) {
      if (this.properties[key] && this.properties[key].type === 'color') {
        if (!this.properties[key].options) {
          this.properties[key].options = []
        }
        this.properties[key].options.push(option)
      }
    },

    // 删除颜色选项
    deleteColorOption(key, index) {
      if (this.properties[key] && this.properties[key].type === 'color') {
        this.properties[key].options.splice(index, 1)
      }
    },

    // 移动颜色选项
    moveColorOption(key, index, direction) {
      if (this.properties[key] && this.properties[key].type === 'color') {
        const options = this.properties[key].options
        if (direction === 'up' && index > 0) {
          const temp = options[index]
          options[index] = options[index - 1]
          options[index - 1] = temp
        } else if (direction === 'down' && index < options.length - 1) {
          const temp = options[index]
          options[index] = options[index + 1]
          options[index + 1] = temp
        }
      }
    },

    // 添加数据选项
    addDataOption(key, option) {
      if (this.properties[key] && this.properties[key].type === 'data') {
        if (!this.properties[key].options) {
          this.properties[key].options = []
        }
        this.properties[key].options.push(option)
      }
    },

    // 删除数据选项
    deleteDataOption(key, index) {
      if (this.properties[key] && this.properties[key].type === 'data') {
        this.properties[key].options.splice(index, 1)
      }
    },

    // 移动数据选项
    moveDataOption(key, index, direction) {
      if (this.properties[key] && this.properties[key].type === 'data') {
        const options = this.properties[key].options
        if (direction === 'up' && index > 0) {
          const temp = options[index]
          options[index] = options[index - 1]
          options[index - 1] = temp
        } else if (direction === 'down' && index < options.length - 1) {
          const temp = options[index]
          options[index] = options[index + 1]
          options[index + 1] = temp
        }
      }
    }
  }
})
