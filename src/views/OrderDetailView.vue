<template>
  <main class="orders-page">
    <section class="detail-shell">
      <div class="detail-header">
        <div>
          <p class="brand">Ben & Jerry's Admin</p>
          <h1>Order details</h1>
        </div>

        <button class="back-button" type="button" @click="goBack">
          Back to orders
        </button>
      </div>

      <p v-if="isLoading" class="state-message">Loading order...</p>
      <p v-else-if="errorMessage" class="state-message state-error" role="alert">
        {{ errorMessage }}
      </p>

      <article v-else-if="order" class="detail-card">
        <div class="detail-top">
          <div>
            <p class="order-label">Customer</p>
            <h2>{{ order.customerName }}</h2>
          </div>
          <span class="status-pill" :data-status="order.status">{{ order.status }}</span>
        </div>

        <dl class="detail-grid">
          <div>
            <dt>Address</dt>
            <dd>{{ order.address }}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{{ order.email }}</dd>
          </div>
          <div>
            <dt>Flavor</dt>
            <dd>{{ order.flavor }}</dd>
          </div>
          <div>
            <dt>Topping</dt>
            <dd>{{ order.topping }}</dd>
          </div>
          <div>
            <dt>Cone</dt>
            <dd>{{ order.cone }}</dd>
          </div>
          <div>
            <dt>Scoops</dt>
            <dd>{{ order.scoops }}</dd>
          </div>
          <div>
            <dt>Total price</dt>
            <dd>{{ formatPrice(order.price) }}</dd>
          </div>
          <div>
            <dt>Order date</dt>
            <dd>{{ formatDate(order.createdAt) }}</dd>
          </div>
        </dl>
      </article>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
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

function goBack() {
  router.push('/orders')
}

async function fetchOrder() {
  isLoading.value = true
  errorMessage.value = ''
  order.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/orders/${route.params.id}`, {
      headers: getAuthHeaders(),
    })

    const data = await response.json()

    if (!response.ok) {
      if (data?.message === 'Order not found') {
        errorMessage.value = 'Order not found.'
      } else {
        errorMessage.value = data?.message || 'Unable to load the order.'
      }
      return
    }

    order.value = data
  } catch {
    errorMessage.value = 'Unable to load the order. Please try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchOrder()
})
</script>