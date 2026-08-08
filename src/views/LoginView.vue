<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <p class="brand">Ben & Jerry's Admin</p>
      <h1 id="login-title">Admin login</h1>
      <p class="login-help">
        Sign in to manage orders from the exam backend.
      </p>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field">
          <label for="username">Username</label>
          <input
            id="username"
            v-model.trim="username"
            type="text"
            autocomplete="username"
            required
          />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="errorMessage" class="login-error" role="alert">
          {{ errorMessage }}
        </p>

        <button class="login-button" type="submit" :disabled="isLoading">
          {{ isLoading ? 'Signing in...' : 'Log in' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const apiBaseUrl = `${import.meta.env.VITE_API_URL}/api`

async function handleLogin() {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value = data?.message || 'Login failed. Please check your credentials.'
      return
    }

    if (data?.token) {
      localStorage.setItem('authToken', data.token)
      await router.push('/orders')
      return
    }

    errorMessage.value = 'Login succeeded but no token was returned by the server.'
  } catch {
    errorMessage.value = 'Unable to reach the login endpoint. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>