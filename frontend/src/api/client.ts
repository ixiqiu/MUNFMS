import axios from 'axios'
import { ElMessage } from 'element-plus'

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('mun_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const data = error.response?.data
    let message = '请求失败'
    if (data instanceof Blob && data.type.includes('json')) {
      try {
        const text = await data.text()
        message = JSON.parse(text)?.message || message
      } catch {
        message = message
      }
    } else if (data?.message) {
      message = Array.isArray(data.message) ? data.message.join('；') : data.message
    }
    if (status === 401) {
      localStorage.removeItem('mun_token')
      localStorage.removeItem('mun_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  },
)

export default client
