import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { DesignerDefaultConfigVO, DesignerDefaultConfigUpdateDTO } from '@/types/api/designer-default-config'

export const designerDefaultConfigApi = {
  getByUserId(userId: number): Promise<ApiResponse<DesignerDefaultConfigVO>> {
    return instance.get(`/admin/design/designer-default-config/by-user/${userId}`)
  },
  update(dto: DesignerDefaultConfigUpdateDTO): Promise<ApiResponse<DesignerDefaultConfigVO>> {
    return instance.post('/admin/design/designer-default-config/update', dto)
  }
}

export default designerDefaultConfigApi
