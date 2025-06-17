// src/components/settings/index.js

// 使用 Vite 的 import.meta.glob 自动导入所有设置组件，包括子文件夹
const modules = import.meta.glob(['./**/*Settings.vue'], { eager: true })

// 创建组件映射表
const componentMap = {}

// 处理每个设置组件
Object.entries(modules).forEach(([path, module]) => {
  // 从文件路径中提取组件类型
  // 例如: 
  // './BatterySettings.vue' -> 'battery'
  // './goal/GoalArcSettings.vue' -> 'goalarc'
  // './goal/GoalBarSettings.vue' -> 'goalbar'
  // './MoveBarSettings.vue' -> 'movebar'
  const match = path.match(/\/(\w+)Settings\.vue$/)
  if (match) {
    const type = match[1].toLowerCase()
    componentMap[type] = module.default
  }
})

// 获取设置组件的函数
export function getSettingsComponent(type) {
  console.log('getSettingsComponent', type)
  if (type == undefined) {
    return null
  }
  // 尝试直接匹配
  if (componentMap[type]) {
    return componentMap[type]
  }
  
  // 尝试匹配带前缀的类型
  const prefixedType = type.toLowerCase()
  if (componentMap[prefixedType]) {
    return componentMap[prefixedType]
  }
  
  // 尝试匹配不带前缀的类型
  const unprefixedType = type.replace(/^goal/, '').toLowerCase()
  if (componentMap[unprefixedType]) {
    return componentMap[unprefixedType]
  }
  
  return null
}

export default componentMap