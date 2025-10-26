import instance from '@/config/axios'
import type { ApiResponse, PageResponse } from '@/types/api/api'
import type {
  TicketVO,
  TicketQueryDTO,
  TicketUpdateStatusDTO,
  TicketCommentCreateDTO,
  TicketComment,
  TicketHistory,
} from '@/types/api/ticket'

export const ticketsApi = {
  list(query: TicketQueryDTO): Promise<ApiResponse<TicketVO[]>> {
    return instance.get('/dsn/contact/tickets/list', { params: query })
  },
  page(data: TicketQueryDTO): Promise<ApiResponse<PageResponse<TicketVO>>> {
    return instance.post('/dsn/contact/tickets/page?populate=*', data)
  },
  count(assigneeId: number, status: string): Promise<ApiResponse<number>> {
    return instance.get('/dsn/contact/tickets/count', { params: { assigneeId, status  } })
  },
  detail(id: number): Promise<ApiResponse<TicketVO>> {
    return instance.get(`/dsn/contact/tickets/${id}`)
  },
  updateStatus(id: number, data: TicketUpdateStatusDTO): Promise<ApiResponse<TicketVO>> {
    return instance.post(`/dsn/contact/tickets/${id}/status`, data)
  },
  comment(id: number, data: TicketCommentCreateDTO): Promise<ApiResponse<void>> {
    return instance.post(`/dsn/contact/tickets/${id}/comment`, data)
  },
  comments(id: number): Promise<ApiResponse<TicketComment[]>> {
    return instance.get(`/dsn/contact/tickets/${id}/comments?populate=*`)
  },
  history(id: number): Promise<ApiResponse<TicketHistory[]>> {
    return instance.get(`/dsn/contact/tickets/${id}/history`)
  },
  tags(): Promise<ApiResponse<string[]>> {
    return instance.get('/dsn/contact/tickets/tags')
  },
  // public enums
  publicStatuses(): Promise<ApiResponse<string[]>> {
    return instance.get('/public/contact/tickets/statuses')
  },
  publicTags(): Promise<ApiResponse<string[]>> {
    return instance.get('/public/contact/tickets/tags')
  },
  publicPriorities(): Promise<ApiResponse<string[]>> {
    return instance.get('/public/contact/tickets/priorities')
  },
}

export default ticketsApi
