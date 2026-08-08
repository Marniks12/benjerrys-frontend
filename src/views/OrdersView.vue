<template>
  <main class="orders-page">
    <section class="orders-dashboard">
      <header class="dashboard-header">
        <div>
          <p class="brand">Ben & Jerry's Admin</p>
          <h1>Orders dashboard</h1>
          <p class="dashboard-subtitle">
            Review customer orders, update statuses, and remove completed entries.
          </p>
        </div>

        <button class="logout-button" type="button" @click="handleLogout">
          Log out
        </button>
      </header>

      <p v-if="isLoading" class="state-message">Loading orders...</p>
      <p v-else-if="errorMessage" class="state-message state-error" role="alert">
        {{ errorMessage }}
      </p>
      <p v-else-if="orders.length === 0" class="state-message">No orders yet.</p>

      <section v-else class="orders-grid" aria-label="Orders list">
        <article v-for="order in orders" :key="order._id" class="order-card">
          <RouterLink :to="`/orders/${order._id}`" class="order-link">
            <div class="order-top">
              <div>
                <p class="order-label">Customer</p>
                <h2>{{ order.customerName }}</h2>
              </div>
              <span class="status-pill" :data-status="order.status">
                {{ order.status }}
              </span>
            </div>

            <dl class="order-details">
              <div>
                <dt>Flavor</dt>
                <dd>{{ order.flavor }}</dd>
              </div>
              <div>
                <dt>Scoops</dt>
                <dd>{{ order.scoops }}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{{ formatPrice(order.price) }}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{{ formatDate(order.createdAt) }}</dd>
              </div>
            </dl>
          </RouterLink>

          <div class="order-actions">
            <label class="status-select-label">
              <span>Status</span>
              <select
                :value="order.status"
                :disabled="isUpdatingId === order._id"
                @change="handleStatusChange(order._id, $event.target.value)"
              >
                <option v-for="status in allowedStatuses" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </label>

            <button
              class="delete-button"
              type="button"
              :disabled="isUpdatingId === order._id"
              @click="handleDelete(order._id)"
            >
              Delete order
            </button>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()
const orders = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const isUpdatingId = ref('')
const allowedStatuses = ['pending', 'processing', 'shipped', 'cancelled']
const apiBaseUrl = `${import.meta.env.VITE_API_URL}/api`

function getAuthHeaders() {
  const token = localStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatPrice(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue)
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function fetchOrders() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/orders`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to load orders.')
    }

    orders.value = await response.json()
  } catch {
    errorMessage.value = 'Unable to load orders. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function handleStatusChange(orderId, nextStatus) {
  isUpdatingId.value = orderId
  errorMessage.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: nextStatus }),
    })

    if (!response.ok) {
      throw new Error('Failed to update order status.')
    }

    await fetchOrders()
  } catch {
    errorMessage.value = 'Could not update the order status.'
  } finally {
    isUpdatingId.value = ''
  }
}

async function handleDelete(orderId) {
  const confirmed = window.confirm('Delete this order?')
  if (!confirmed) {
    return
  }

  isUpdatingId.value = orderId
  errorMessage.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/orders/${orderId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to delete order.')
    }

    await fetchOrders()
  } catch {
    errorMessage.value = 'Could not delete the order.'
  } finally {
    isUpdatingId.value = ''
  }
}

function handleLogout() {
  localStorage.removeItem('authToken')
  router.replace('/login')
}

onMounted(() => {
  fetchOrders()
})
</script>