import { usesGoalProgress } from '@/elements/decoration/dynamicImage/dynamicImage.goal'

export const BITMAP_DATA_FEATURE = 'bitmap-data-v1'
export function hasBitmapData(config: { elements?: readonly any[] }): boolean {
  return Boolean(config.elements?.some(element => element.eleType === 'data' && element.fontRenderType === 'bitmap'))
}

export const GOAL_PROGRESS_IMAGES_FEATURE = 'goal-progress-images-v1'
export function hasGoalProgressImages(config: { elements?: readonly any[] }): boolean {
  return Boolean(config.elements?.some(element => element.eleType === 'dynamicImage' && usesGoalProgress(element)))
}
export function validateWrtCapabilities(manifest: { version: number; requiredFeatures?: unknown }, config: { elements?: readonly any[] }): string[] {
  const errors: string[] = []
  const features = manifest.requiredFeatures ?? []
  if (!Array.isArray(features) || features.some(feature => ![GOAL_PROGRESS_IMAGES_FEATURE, BITMAP_DATA_FEATURE].includes(feature))) errors.push('This WRT requires unsupported features. Update Wristo Studio.')
  if (hasGoalProgressImages(config) && (manifest.version < 3 || !Array.isArray(features) || !features.includes(GOAL_PROGRESS_IMAGES_FEATURE))) errors.push('Goal progress images require WRT v3 and goal-progress-images-v1 support.')
  if (hasBitmapData(config) && (manifest.version < 3 || !Array.isArray(features) || !features.includes(BITMAP_DATA_FEATURE))) errors.push('Bitmap data requires WRT v3 and bitmap-data-v1 support.')
  return errors
}
