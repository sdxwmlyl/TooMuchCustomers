import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 客户API
export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  getStats: () => api.get('/customers/stats'),
  create: (data) => api.post('/customers', data),
  get: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.put(`/customers/${id}`, data),
  updateStatus: (id, status) => api.put(`/customers/${id}/status`, { status }),
  delete: (id) => api.delete(`/customers/${id}`),
  getMessages: (id) => api.get(`/customers/${id}/messages`),
  sendMessage: (id, content, role = 'user') => api.post(`/customers/${id}/messages`, { content, role }),
  getFollowups: (id) => api.get(`/customers/${id}/followups`),
  createFollowup: (id, data) => api.post(`/customers/${id}/followups`, data)
}

// 上传API
export const uploadApi = {
  upload: (customerId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/upload/${customerId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// 配置API
export const configApi = {
  get: () => api.get('/config'),
  update: (models) => api.put('/config', { models })
}

// 分析API
export const analysisApi = {
  analyze: (customerId) => api.post(`/analysis/${customerId}/analyze`),
  generateSolution: (customerId) => api.post(`/analysis/${customerId}/solution`),
  getFiles: (customerId) => api.get(`/analysis/${customerId}/files`),
  getFile: (customerId, filename) => api.get(`/analysis/${customerId}/files/${filename}`)
}

export default api
