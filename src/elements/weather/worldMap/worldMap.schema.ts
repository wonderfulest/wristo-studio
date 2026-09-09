import { normalizeWorldMap } from './worldMap.model'
export const worldMapSchema = {
  type: 'worldMap',
  name: 'World Map',
  icon: 'mdi:map-marker-radius',
  defaultConfig: normalizeWorldMap({}),
  resizable: true,
  rotatable: false
}
