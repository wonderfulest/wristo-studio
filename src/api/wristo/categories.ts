import axiosInstance from '@/config/axios'
import type { Category } from '@/types/api/category'

/**
 * 获取所有系列分类
 * @returns {Promise<Category[]>} 分类列表
 */
export const getAllSeries = async (): Promise<Category[]> => {
  const response = await axiosInstance.get('/public/categories/all')
  return response.data
}

/**
 * 获取分类详情
 * @param {number} id - 分类ID
 * @returns {Promise<Category>} 分类详情
 */
export const getCategoryById = async (id: number): Promise<Category> => {
  const response = await axiosInstance.get(`/public/categories/${id}`)
  return response.data
}
