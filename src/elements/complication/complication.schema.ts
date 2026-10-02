import { COMPLICATION_PRESENTATION_DEFAULTS } from './complication.presentation'
export const complicationSchema = {
  type: 'complication',
  name: 'Complication',
  icon: 'mdi:gesture-tap-hold',
  defaultConfig: {
    ...COMPLICATION_PRESENTATION_DEFAULTS,
    complicationType: 18,
    complicationProperty: '',
    displayMode: 'value',
    touchWidth: 96,
    touchHeight: 64,
    launchOnPress: true,
    fontFamily: 'roboto-condensed-regular',
    fontSize: 36,
    fill: '#ffffff'
  },
  resizable: false,
  rotatable: false
}
