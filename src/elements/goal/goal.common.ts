import { nanoid } from 'nanoid'

/**
 * 确保元素 id 非空：
 * - 有值且非空白字符串：返回原值
 * - 其他：生成新的 nanoid
 */
export function ensureGoalElementId(rawId?: string | null): string {
  if (rawId && String(rawId).trim().length > 0) {
    return String(rawId)
  }
  return nanoid()
}

/**
 * 统一裁剪进度到 0..1 区间，异常值按 0 处理
 */
export function clampProgress(value: number | null | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
