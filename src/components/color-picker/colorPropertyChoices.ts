import type { PropertiesMap } from '@/types/properties'

export type ColorPropertyChoice = {
  name: string
  propertyKey: string
  value: string
  hex: string
}

const toDisplayHex = (value: string): string =>
  /^0x/i.test(value) ? `#${value.slice(2)}` : value

export const buildColorPropertyChoices = (
  properties: PropertiesMap,
  resolveValue: (propertyKey: string) => unknown,
): ColorPropertyChoice[] =>
  Object.entries(properties)
    .filter(([, property]) => property.type === 'color')
    .map(([propertyKey, property]) => {
      const value = String(resolveValue(propertyKey) ?? property.value ?? '')
      return {
        name: property.title,
        propertyKey,
        value,
        hex: toDisplayHex(value),
      }
    })
