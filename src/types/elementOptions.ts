/**
 * 元素配置类型定义 - 使用继承结构优化类型安全
 */

import { FabricText, TextProps, TOriginX, TOriginY } from 'fabric'

export interface BaseElementOptions  {
  id: string;
  eleType: string;
}

export interface TimeElementOptions extends BaseElementOptions, TextProps {
  formatter: number
}