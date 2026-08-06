import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import OrderDetailView from '../views/OrderDetailView.vue'
import OrdersView from '../views/OrdersView.vue'
import CustomizeView from '../views/CustomizeView.vue'

const routes = [
  {
    path: '/',
    redirect: '/customize',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/orders',
    name: 'orders',
    component: OrdersView,
  },
  {
    path: '/orders/:id',
    name: 'order-detail',
    component: OrderDetailView,
  },
  {
    path: '/customize',
    name: 'customize',
    component: CustomizeView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
