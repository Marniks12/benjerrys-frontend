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
let coneMesh = null
let scoopMeshes = []
let toppingMeshes = []
let originalConeMaterial = null
let coneMaterialTemplate = null
let sceneReady = false

function getFlavorColor() {
  return flavors.find((flavor) => flavor.value === selectedFlavor.value)?.color || '#f5e3bc'
}

function createScoopMaterial(color) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.85,
    metalness: 0.02,
    clearcoat: 0.2,
    clearcoatRoughness: 0.2,
  })

  return material
}

function createConeMaterial(coneType) {
  const presets = {
    waffle: { color: '#8b5a2b', roughness: 0.8, metalness: 0.05 },
    chocolate: { color: '#6b3f1d', roughness: 0.7, metalness: 0.05 },
    sugar: { color: '#e8d7b4', roughness: 0.9, metalness: 0.02 },
  }

  const preset = presets[coneType] || presets.waffle

  return new THREE.MeshPhysicalMaterial({
    color: preset.color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    clearcoat: 0.1,
  })
}

function createProceduralCone() {
  const coneGeometry = new THREE.ConeGeometry(0.7, 1.55, 28, 1, false)
  const cone = new THREE.Mesh(coneGeometry, createConeMaterial(selectedCone.value))

  cone.name = 'procedural-cone'
  cone.castShadow = true
  cone.receiveShadow = true
  cone.position.set(0, -0.92, 0)
  cone.rotation.x = Math.PI

  return cone
}

function createProceduralToppingGroup() {
  const toppingGroup = new THREE.Group()
  toppingGroup.name = 'procedural-topping-group'

  const sprinkleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6)
  const sprinkleCount = 24
  const sprinklePalette = ['#ff8c69', '#ffe066', '#88d8ff', '#ffffff', '#7c4a2e']

  for (let index = 0; index < sprinkleCount; index += 1) {
    const material = new THREE.MeshPhysicalMaterial({
      color: sprinklePalette[index % sprinklePalette.length],
      roughness: 0.8,
      metalness: 0.01,
    })

    const sprinkle = new THREE.Mesh(sprinkleGeometry.clone(), material)
    const angle = (index / sprinkleCount) * Math.PI * 2
    const radius = 0.22 + (index % 3) * 0.03
    const height = 1.02 + (index % 4) * 0.02

    sprinkle.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius)
    sprinkle.rotation.set(Math.PI / 2, 0, angle)
    sprinkle.castShadow = true
    sprinkle.receiveShadow = true

    toppingGroup.add(sprinkle)
  }

  toppingGroup.visible = false
  return toppingGroup
}

function applyConeStyle(coneType) {
  if (!coneMesh?.material) {
    return
  }

  const coneMaterial = createConeMaterial(coneType)
  const material = coneMesh.material

  material.color.set(coneMaterial.color)
  if ('roughness' in material) material.roughness = coneMaterial.roughness
  if ('metalness' in material) material.metalness = coneMaterial.metalness
  if ('clearcoat' in material) material.clearcoat = coneMaterial.clearcoat
  if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.15
}

function applyToppingStyle() {
  if (!toppingMeshes.length) {
    if (toppingMeshes.group) {
      toppingMeshes.group.visible = selectedTopping.value !== 'none'
    }
    return
  }

  const shouldShow = selectedTopping.value !== 'none'
  toppingMeshes.forEach((mesh) => {
    mesh.visible = shouldShow
  })
}

function applyCustomization() {
  if (!sceneReady || !modelGroup) {
    return
  }

  const flavorColor = getFlavorColor()
  const scoopColor = new THREE.Color(flavorColor)
  const desiredCount = Math.min(3, Math.max(1, Number(selectedScoops.value) || 1))

  scoopMeshes.forEach((mesh, index) => {
    mesh.visible = index < desiredCount

    if (!mesh.material) {
      return
    }

    const material = mesh.material
    if (material.isMeshPhysicalMaterial || material.isMeshStandardMaterial || material.isMeshBasicMaterial) {
      material.color.set(scoopColor)
      if ('roughness' in material) material.roughness = 0.85
      if ('metalness' in material) material.metalness = 0.02
      if ('clearcoat' in material) material.clearcoat = 0.2
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.2
    }
  })

  applyConeStyle(selectedCone.value)

  toppingMeshes.forEach((mesh) => {
    const shouldShow = selectedTopping.value !== 'none'
    mesh.visible = shouldShow
  })

  if (toppingMeshes.group) {
    toppingMeshes.group.visible = selectedTopping.value !== 'none'
  }

  if (scoopMeshes.length) {
    const baseHeight = 0.42
    const verticalGap = 0.28

    scoopMeshes.forEach((mesh, index) => {
      const y = baseHeight + index * verticalGap
      mesh.position.set(0, y, 0)
      mesh.scale.setScalar(1)
      mesh.visible = index < desiredCount
    })
  }

  if (coneMesh) {
    coneMesh.position.set(0, -0.92, 0)
    coneMesh.scale.setScalar(1)
    coneMesh.visible = true
  }

  if (selectedTopping.value !== 'none' && toppingMeshes.group) {
    const toppingHeight = 0.42 + (desiredCount - 1) * 0.28 + 0.46
    toppingMeshes.group.position.set(0, toppingHeight, 0)
  }
}

function ensureModelParts() {
  if (!modelGroup) {
    return
  }

  const scoopCandidates = []
  modelGroup.traverse((object) => {
    if (!object.isMesh) {
      return
    }

    const name = (object.name || '').toLowerCase()
    if (name.includes('scoop') || name.includes('ice') || name.includes('cream')) {
      scoopCandidates.push(object)
    }
  })

  scoopCandidates.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
  scoopMeshes = scoopCandidates.slice(0, 3)

  if (scoopMeshes.length > 0 && scoopMeshes.length < 3) {
    const templateMesh = scoopMeshes[0]

    for (let index = scoopMeshes.length; index < 3; index += 1) {
      const clone = templateMesh.clone()
      clone.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material?.clone?.() || child.material
        }
      })
      modelGroup.add(clone)
      scoopMeshes.push(clone)
    }
  }

  const toppingNames = ['sprinkle', 'topping', 'chip', 'candy']
  modelGroup.traverse((object) => {
    if (!object.isMesh) {
      return
    }

    const name = (object.name || '').toLowerCase()
    if (toppingNames.some((token) => name.includes(token))) {
      toppingMeshes.push(object)
    }
  })

  if (coneMesh && !originalConeMaterial && coneMesh.material) {
    originalConeMaterial = coneMesh.material.clone()
    coneMaterialTemplate = originalConeMaterial
  }

  if (!coneMesh) {
    coneMesh = createProceduralCone()
    modelGroup.add(coneMesh)
  }

  if (!toppingMeshes.length) {
    toppingMeshes.group = createProceduralToppingGroup()
    modelGroup.add(toppingMeshes.group)
  }

  if (scoopMeshes.length > 0) {
    scoopMeshes.forEach((mesh) => {
      mesh.visible = true
    })
  }

  if (coneMesh && coneMesh.material) {
    coneMesh.material = coneMesh.material.clone()
  }
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
  const scale = maxDimension > 0 ? 1.75 / maxDimension : 1
  modelGroup.scale.setScalar(scale)

  const scaledBox = new THREE.Box3().setFromObject(modelGroup)
  const scaledCenter = new THREE.Vector3()
  scaledBox.getCenter(scaledCenter)

  modelGroup.position.x -= scaledCenter.x
  modelGroup.position.y -= scaledBox.min.y
  modelGroup.position.z -= scaledCenter.z
  modelGroup.position.x += 0.28

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
      toppingMeshes = []
      coneMesh = null
      originalConeMaterial = null
      coneMaterialTemplate = null

      modelGroup.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true
          object.receiveShadow = true
          if (object.material) {
            object.material = object.material.clone()
          }
        }
      })

      ensureModelParts()
      scene.add(modelGroup)
      fitCameraToModel()
      sceneReady = true
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

watch([selectedFlavor, selectedScoops, selectedCone, selectedTopping], () => {
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