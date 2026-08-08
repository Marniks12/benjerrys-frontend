<template>
  <main class="customize-page">
    <section class="customize-shell">
      <header class="customize-hero">
        <div>
          <p class="brand">Ben & Jerry's</p>
          <h1>Customize your ice cream</h1>
          <p class="customize-intro">
            Rotate the 3D model, choose a flavor, and decide how many scoops you want.
          </p>
        </div>

        <RouterLink class="admin-link" to="/login">
          Admin login
        </RouterLink>
      </header>

      <div class="customize-grid">
        <section class="scene-card" aria-label="3D ice cream preview">
          <div ref="sceneHost" class="scene-host"></div>
          <p class="scene-help">Drag to rotate. Use the controls to change flavor and scoops.</p>
        </section>

        <section class="controls-card">
          <div class="control-group">
            <h2>Flavor</h2>
            <div class="flavor-grid">
              <button
                v-for="flavor in flavors"
                :key="flavor.value"
                class="option-button"
                :class="{ 'is-active': selectedFlavor === flavor.value }"
                type="button"
                @click="selectedFlavor = flavor.value"
              >
                {{ flavor.label }}
              </button>
            </div>
          </div>

          <div class="control-group">
            <h2>Scoops</h2>
            <div class="scoop-row">
              <button
                v-for="count in scoopOptions"
                :key="count"
                class="option-button option-button--round"
                :class="{ 'is-active': selectedScoops === count }"
                type="button"
                @click="selectedScoops = count"
              >
                {{ count }}
              </button>
            </div>
          </div>

          <div class="control-group">
            <h2>Topping & cone</h2>

            <label class="input-label" for="topping">Topping</label>
            <select id="topping" v-model="selectedTopping" class="select-input">
              <option v-for="topping in toppings" :key="topping.value" :value="topping.value">
                {{ topping.label }}
              </option>
            </select>

            <label class="input-label" for="cone">Cone</label>
            <select id="cone" v-model="selectedCone" class="select-input">
              <option v-for="cone in cones" :key="cone.value" :value="cone.value">
                {{ cone.label }}
              </option>
            </select>
          </div>

          <div class="summary-card">
            <p class="summary-label">Current selection</p>
            <p class="summary-text">
              {{ selectedFlavorLabel }} with {{ selectedScoops }} scoop{{ selectedScoops > 1 ? 's' : '' }},
              {{ selectedToppingLabel }} topping and {{ selectedConeLabel }} cone
            </p>
            <p class="summary-price">Total price: {{ formattedPrice }}</p>
          </div>

          <form class="order-form" @submit.prevent="handleSubmitOrder">
            <div class="control-group">
              <h2>Your details</h2>

              <label class="input-label" for="customerName">Customer name</label>
              <input id="customerName" v-model.trim="customerName" class="text-input" type="text" autocomplete="name" />

              <label class="input-label" for="email">Email</label>
              <input id="email" v-model.trim="email" class="text-input" type="email" autocomplete="email" />

              <label class="input-label" for="address">Address</label>
              <textarea
                id="address"
                v-model.trim="address"
                class="text-input text-area"
                rows="3"
                autocomplete="street-address"
              ></textarea>
            </div>

            <p v-if="validationMessage" class="form-message form-message--error" role="alert">
              {{ validationMessage }}
            </p>

            <p v-if="submitSuccessMessage" class="form-message form-message--success" role="status">
              {{ submitSuccessMessage }}
            </p>

            <p v-if="submitErrorMessage" class="form-message form-message--error" role="alert">
              {{ submitErrorMessage }}
            </p>

            <button class="order-button" type="submit" :disabled="isSubmitting">
              {{ isSubmitting ? 'Placing order...' : 'Order Now' }}
            </button>
          </form>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import iceCreamModelUrl from '../assets/models/ice-cream.glb?url'

const sceneHost = ref(null)
const selectedFlavor = ref('vanilla')
const selectedScoops = ref(2)
const selectedTopping = ref('none')
const selectedCone = ref('waffle')
const customerName = ref('')
const email = ref('')
const address = ref('')
const isSubmitting = ref(false)
const validationMessage = ref('')
const submitSuccessMessage = ref('')
const submitErrorMessage = ref('')
const apiBaseUrl = `${import.meta.env.VITE_API_URL}/api`

const flavors = [
  { value: 'vanilla', label: 'Vanilla', color: '#f5e3bc' },
  { value: 'chocolate', label: 'Chocolate', color: '#7c4a2e' },
  { value: 'strawberry', label: 'Strawberry', color: '#f28ca8' },
  { value: 'cookie-dough', label: 'Cookie Dough', color: '#d8b07b' },
]

const scoopOptions = [1, 2, 3]
const toppings = [
  { value: 'none', label: 'None', price: 0 },
  { value: 'chocolate', label: 'Chocolate', price: 1 },
  { value: 'sprinkles', label: 'Sprinkles', price: 0.5 },
  { value: 'caramel', label: 'Caramel', price: 1 },
]

const cones = [
  { value: 'waffle', label: 'Waffle', price: 0 },
  { value: 'chocolate', label: 'Chocolate', price: 1 },
  { value: 'sugar', label: 'Sugar', price: 0.5 },
]

const selectedFlavorLabel = computed(() => {
  return flavors.find((flavor) => flavor.value === selectedFlavor.value)?.label || 'Vanilla'
})

const selectedToppingLabel = computed(() => {
  return toppings.find((topping) => topping.value === selectedTopping.value)?.label || 'None'
})

const selectedConeLabel = computed(() => {
  return cones.find((cone) => cone.value === selectedCone.value)?.label || 'Waffle'
})

const totalPrice = computed(() => {
  const scoopPrice = 5 + Math.max(0, Number(selectedScoops.value) - 1) * 2
  const toppingPrice = toppings.find((topping) => topping.value === selectedTopping.value)?.price || 0
  const conePrice = cones.find((cone) => cone.value === selectedCone.value)?.price || 0

  return scoopPrice + toppingPrice + conePrice
})

const formattedPrice = computed(() => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(totalPrice.value)
})

let renderer
let scene
let camera
let controls
let animationFrameId
let resizeHandler
let modelGroup = null
let scoopMeshes = []

function getFlavorColor() {
  return flavors.find((flavor) => flavor.value === selectedFlavor.value)?.color || '#f5e3bc'
}

function applyCustomization() {
  const color = new THREE.Color(getFlavorColor())

  scoopMeshes.forEach((mesh, index) => {
    mesh.visible = index < selectedScoops.value
    if (mesh.material) {
      mesh.material.color.set(color)
      mesh.material.roughness = 0.85
      mesh.material.metalness = 0.02
    }
  })
}

function fitCameraToModel() {
  if (!modelGroup || !camera || !controls) {
    return
  }

  const box = new THREE.Box3().setFromObject(modelGroup)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const maxDimension = Math.max(size.x, size.y, size.z)
  const scale = maxDimension > 0 ? 2.2 / maxDimension : 1
  modelGroup.scale.setScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(modelGroup)
  const scaledCenter = new THREE.Vector3()
  scaledBox.getCenter(scaledCenter)

  modelGroup.position.x -= scaledCenter.x
  modelGroup.position.y -= scaledBox.min.y
  modelGroup.position.z -= scaledCenter.z

  camera.position.set(0, 1.4, 4.6)
  camera.lookAt(0, 1, 0)
  controls.target.set(0, 1, 0)
  controls.update()
}

function resizeRenderer() {
  if (!renderer || !camera || !sceneHost.value) {
    return
  }

  const { clientWidth, clientHeight } = sceneHost.value
  renderer.setSize(clientWidth, clientHeight, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
}

function animate() {
  animationFrameId = window.requestAnimationFrame(animate)
  if (controls) {
    controls.update()
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function resetSubmitMessages() {
  validationMessage.value = ''
  submitSuccessMessage.value = ''
  submitErrorMessage.value = ''
}

function validateForm() {
  if (!customerName.value.trim()) {
    return 'Please enter your name.'
  }

  if (!email.value.trim()) {
    return 'Please enter your email address.'
  }

  if (!email.value.includes('@')) {
    return 'Please enter a valid email address.'
  }

  if (!address.value.trim()) {
    return 'Please enter your address.'
  }

  return ''
}

async function handleSubmitOrder() {
  resetSubmitMessages()

  const validationError = validateForm()
  if (validationError) {
    validationMessage.value = validationError
    return
  }

  isSubmitting.value = true

  try {
    const response = await fetch(`${apiBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: customerName.value,
        address: address.value,
        email: email.value,
        flavor: selectedFlavor.value,
        topping: selectedTopping.value,
        cone: selectedCone.value,
        scoops: selectedScoops.value,
        price: Number(totalPrice.value.toFixed(2)),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      submitErrorMessage.value = data?.message || 'Could not place the order.'
      return
    }

    submitSuccessMessage.value = 'Your order has been placed successfully.'
    customerName.value = ''
    email.value = ''
    address.value = ''
  } catch {
    submitErrorMessage.value = 'Could not place the order. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#fff6ed')
  scene.fog = new THREE.Fog('#fff6ed', 6, 16)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 1.4, 4.6)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.shadowMap.enabled = true

  const host = sceneHost.value
  host.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight('#ffffff', 1.9)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight('#ffffff', 2.4)
  keyLight.position.set(2.5, 5, 4)
  keyLight.castShadow = true
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight('#ffd9b3', 1.1)
  fillLight.position.set(-3, 2, 3)
  scene.add(fillLight)

  const loader = new GLTFLoader()
  loader.load(
    iceCreamModelUrl,
    (gltf) => {
      modelGroup = gltf.scene
      scoopMeshes = []

      modelGroup.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true
          object.receiveShadow = true
          if (object.material) {
            object.material = object.material.clone()
          }
          scoopMeshes.push(object)
        }
      })

      scene.add(modelGroup)
      fitCameraToModel()
      applyCustomization()
      resizeRenderer()
    },
    undefined,
    () => {
      // If the model fails to load, keep the page functional and show an empty scene.
      resizeRenderer()
    }
  )

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 2.8
  controls.maxDistance = 8
  controls.maxPolarAngle = Math.PI * 0.56
  controls.target.set(0, 1, 0)

  resizeHandler = () => {
    resizeRenderer()
  }
  window.addEventListener('resize', resizeHandler)

  animate()
  resizeRenderer()
})

watch([selectedFlavor, selectedScoops], () => {
  applyCustomization()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
  }

  controls?.dispose()
  renderer?.dispose()

  if (scene) {
    scene.traverse((object) => {
      if (object.isMesh) {
        object.geometry?.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material?.dispose()
        }
      }
    })
  }
})
</script>