// Auto register all *Settings.vue components in this folder (and subfolders)
import type { Component } from 'vue'

const modules = import.meta.glob<{ default: Component }>(['./**/*Settings.vue'], { eager: true })

// Create component map
const componentMap: Record<string, Component> = {}

Object.entries(modules).forEach(([path, mod]) => {
  const match = path.match(/\/(\w+)Settings\.vue$/)
  if (match) {
    const type = match[1].toLowerCase()
    componentMap[type] = mod.default
  }
})

export function getSettingsComponent(type?: string): Component | null {
  console.log('getSettingsComponent type', type)
  if (type == null) return null

  // direct match
  if (componentMap[type]) return componentMap[type]

  // prefixed type (already lowercase)
  const prefixedType = type.toLowerCase()
  if (componentMap[prefixedType]) return componentMap[prefixedType]

  // unprefixed goal*
  const unprefixedType = type.replace(/^goal/, '').toLowerCase()
  if (componentMap[unprefixedType]) return componentMap[unprefixedType]

  return null
}

export default componentMap
