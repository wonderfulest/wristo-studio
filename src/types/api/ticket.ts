import type { PageResponse, PageQueryDTO } from '@/types/api/api'
import type { Product } from '@/types/api/product'
import type { UserBase } from '@/types/api/user'

export interface TicketVO {
  id: number
  title: string
  description: string
  priority: string
  status: string
  assigneeId: number | null
  creatorId: number | null
  closedBy: number | null
  dueDate: string | null
  tags: string | null
  attachments: string | null
  productId: number | null
  isActive: number | null
  isDeleted: number | null
  createdAt: string
  updatedAt: string
  version: number | null
  product?: Product
  comments?: TicketComment[]
}

export interface TicketQueryDTO extends PageQueryDTO {
  statuses?: string[]
  status?: string
  priorities?: string[]
  priority?: string
  assigneeId?: number
  beginAt?: string
  endAt?: string
}

export type TicketPageResponse = PageResponse<TicketVO>

export interface TicketUpdateStatusDTO {
  status: string
  operatorId: number
}

export interface TicketCommentCreateDTO {
  userId: number
  content: string
  attachments?: string
}

export interface TicketComment {
  id: number
  ticketId: number
  userId: number
  content: string
  attachments: string | null
  createdAt: string
  updatedAt: string
  isDeleted: number | null
  version: number | null
  user?: UserBase
}

export interface TicketHistory {
  id: number
  ticketId: number
  action: string
  fromValue: string | null
  toValue: string | null
  operatorId: number
  createdAt: string
  updatedAt: string
  isDeleted: number | null
  version: number | null
}
