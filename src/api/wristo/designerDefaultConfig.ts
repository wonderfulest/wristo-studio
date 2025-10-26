import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { DesignerDefaultConfigVO, DesignerDefaultConfigUpdateDTO, DesignerDefaultConfigCreateDTO } from '@/types/api/designer-default-config'

export const designerDefaultConfigApi = {
  getByUserId(userId: number): Promise<ApiResponse<DesignerDefaultConfigVO>> {
    return instance.get(`/dsn/design/designer-default-config/by-user/${userId}`)
  },
  create(dto: DesignerDefaultConfigCreateDTO): Promise<ApiResponse<DesignerDefaultConfigVO>> {
    return instance.post('/dsn/design/designer-default-config', dto)
  },
  update(dto: DesignerDefaultConfigUpdateDTO): Promise<ApiResponse<DesignerDefaultConfigVO>> {
    return instance.post('/dsn/design/designer-default-config/update', dto)
  }
}

export default designerDefaultConfigApi
