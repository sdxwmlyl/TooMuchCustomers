import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { customerApi, uploadApi, analysisApi } from '../api'

export const useCustomerStore = defineStore('customer', () => {
  // State
  const customers = ref([])
  const currentCustomer = ref(null)
  const messages = ref([])
  const analysisFiles = ref([])
  const loading = ref(false)
  const searchQuery = ref('')

  // Getters
  const filteredCustomers = computed(() => {
    if (!searchQuery.value) return customers.value
    const q = searchQuery.value.toLowerCase()
    return customers.value.filter(c => c.name.toLowerCase().includes(q))
  })

  // Actions
  async function fetchCustomers() {
    loading.value = true
    try {
      const res = await customerApi.list()
      customers.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createCustomer(name) {
    const res = await customerApi.create(name)
    customers.value.unshift(res.data)
    return res.data
  }

  async function selectCustomer(customer) {
    currentCustomer.value = customer
    if (customer) {
      await Promise.all([
        fetchMessages(customer.id),
        fetchAnalysisFiles(customer.id)
      ])
    }
  }

  async function fetchMessages(customerId) {
    const res = await customerApi.getMessages(customerId)
    messages.value = res.data
  }

  async function sendMessage(content, role = 'user') {
    if (!currentCustomer.value) return
    const res = await customerApi.sendMessage(currentCustomer.value.id, content, role)
    messages.value.push(res.data)
    return res.data
  }

  async function uploadFile(file) {
    if (!currentCustomer.value) return
    const res = await uploadApi.upload(currentCustomer.value.id, file)
    return res.data
  }

  async function fetchAnalysisFiles(customerId) {
    const res = await analysisApi.getFiles(customerId)
    analysisFiles.value = res.data
  }

  async function analyzeCustomer() {
    if (!currentCustomer.value) return
    loading.value = true
    try {
      const res = await analysisApi.analyze(currentCustomer.value.id)
      await fetchAnalysisFiles(currentCustomer.value.id)
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function generateSolution() {
    if (!currentCustomer.value) return
    loading.value = true
    try {
      const res = await analysisApi.generateSolution(currentCustomer.value.id)
      await fetchAnalysisFiles(currentCustomer.value.id)
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function deleteCustomer(id) {
    await customerApi.delete(id)
    customers.value = customers.value.filter(c => c.id !== id)
    if (currentCustomer.value?.id === id) {
      currentCustomer.value = null
      messages.value = []
    }
  }

  return {
    customers,
    currentCustomer,
    messages,
    analysisFiles,
    loading,
    searchQuery,
    filteredCustomers,
    fetchCustomers,
    createCustomer,
    selectCustomer,
    fetchMessages,
    sendMessage,
    uploadFile,
    fetchAnalysisFiles,
    analyzeCustomer,
    generateSolution,
    deleteCustomer
  }
})
