import { ElementConfig } from "../element"

export interface BaseTextConfig extends ElementConfig {
  left: number
  top: number
  fontSize: number
  fill: string
  fontFamily: string
  originX: 'left' | 'center' | 'right'
  originY: 'top' | 'center' | 'bottom'
}

export interface DataElementConfig extends BaseTextConfig {
  eleType: 'data'
  dataProperty?: string | null
  goalProperty?: string | null
}

export interface IconElementOptions extends BaseTextConfig {
  eleType: 'icon'
  iconFontFamily?: string
  dataProperty: string 
  goalProperty: string
}


export interface LabelElementConfig extends BaseTextConfig {
  eleType: 'label'
  dataProperty?: string | null
  goalProperty?: string | null
  text?: string
  originalText?: string
}
