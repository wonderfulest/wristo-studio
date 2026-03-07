import type { Component } from 'vue'
import type { ElementType } from '@/types/element'

export type SettingsHandler = {
  component: Component
}

const settingsRegistry = new Map<ElementType, SettingsHandler>()

export function registerSettings(type: ElementType, component: Component) {
  settingsRegistry.set(type, { component })
}

export function getSettingsComponent(type: ElementType): Component | null {
  return settingsRegistry.get(type)?.component ?? null
}

export function getAllSettings() {
  return Array.from(settingsRegistry.entries())
}
