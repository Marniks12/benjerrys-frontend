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
    meta: { requiresAuth: true },
  },
  {
    path: '/orders/:id',
    name: 'order-detail',
    component: OrderDetailView,
    meta: { requiresAuth: true },
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

function isAuthenticated() {
  return Boolean(localStorage.getItem('authToken'))
}

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !isAuthenticated()) {
    next({ name: 'login' })
    return
  }

  if (to.name === 'login' && isAuthenticated()) {
    next({ name: 'orders' })
    return
  }

  next()
})

export default router
