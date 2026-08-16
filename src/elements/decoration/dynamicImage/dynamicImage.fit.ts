export function calculateDynamicImageStretch(
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
) {
  return { scaleX: frameWidth / sourceWidth, scaleY: frameHeight / sourceHeight }
}
