import type { BaseElementConfig } from './base'

export interface RotationCenter {
  x: number
  y: number
}

export interface HandElementConfig extends BaseElementConfig {
  imageUrl: string
  rotationCenter: RotationCenter
  targetHeight: number
  moveDy: number
}
