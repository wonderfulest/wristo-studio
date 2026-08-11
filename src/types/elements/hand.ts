import type { BaseElementConfig } from './base'

export interface RotationCenter {
  x: number
  y: number
}

export interface HandElementConfig extends BaseElementConfig {
  assetId: number | null
  imageUrl: string | null
  rotationCenter: RotationCenter
  targetHeight: number
  moveDy: number
  angle: number
  height: number
  centerX?: number
  centerY?: number
  pivotOffsetX?: number
  pivotOffsetY?: number
  scalePercent?: number
}
