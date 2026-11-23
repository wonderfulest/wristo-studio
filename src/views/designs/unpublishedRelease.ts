import dayjs from 'dayjs'
import type { DesignListItem } from '@/types/api/design'

export function hasUnpublishedRelease(design: DesignListItem): boolean {
  const updatedAt = design.product?.release?.updatedAt
  if (!updatedAt || !dayjs(updatedAt).isValid()) return false
  const lastGoLive = design.product?.latestPublishedAt ?? design.product?.lastGoLive
  return !lastGoLive || dayjs(updatedAt).isAfter(dayjs(lastGoLive))
}
