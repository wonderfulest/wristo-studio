import axios, { type AxiosInstance } from 'axios'

const axiosKpayInstance: AxiosInstance = axios.create({
  baseURL: 'https://api.kiezelpay.com/api',
  timeout: 10000,
  headers: {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
  },
})

// 添加默认的 key 参数
axiosKpayInstance.defaults.params = {
  key: '0cff75a6b5fdf972c83072e6e42e816e',
}

export default axiosKpayInstance
