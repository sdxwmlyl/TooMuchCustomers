import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import CustomerDetail from './views/CustomerDetail.vue'
import ConfigView from './views/ConfigView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/customer/:id',
    name: 'customer-detail',
    component: CustomerDetail
  },
  {
    path: '/config',
    name: 'config',
    component: ConfigView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
