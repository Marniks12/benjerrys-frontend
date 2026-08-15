<template>
  <main class="customize-page">
    <section class="customize-shell">
      <header class="customize-hero">
        <div>
          <p class="brand">Ben & Jerry's</p>
          <h1>Customize your ice cream</h1>
          <p class="customize-intro">
            Rotate the 3D model, choose a flavor, topping, and cone.
          </p>
        </div>

        <RouterLink class="admin-link" to="/login">
          Admin login
        </RouterLink>
      </header>

      <div class="customize-grid">
        <section class="scene-card" aria-label="3D ice cream preview">
          <div ref="sceneHost" class="scene-host"></div>
          <p class="scene-help">Drag to rotate. Use the controls to change flavor, topping, and cone.</p>
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
              {{ selectedFlavorLabel }} ice cream with {{ selectedToppingLabel }} topping and {{ selectedConeLabel }} cone
            </p>
            <p class="summary-price">Total price: {{ formattedPrice }}</p>
          </div>

          <form class="order-form" @submit.prevent="handleSubmitOrder">
            <div class="control-group">
              <h2>Your details</h2>

              <label class="input-label" for="customerName">Customer name</label>
              <input id="customerName" v-model.trim="customerName" class="text-input" type="text" autocomplete="name" maxlength="100" />

              <label class="input-label" for="email">Email</label>
              <input id="email" v-model.trim="email" class="text-input" type="email" autocomplete="email" maxlength="100" />

              <label class="input-label" for="address">Address</label>
              <textarea
                id="address"
                v-model.trim="address"
                class="text-input text-area"
                rows="3"
                autocomplete="street-address"
                maxlength="300"
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
  { value: 'chocolate', label: 'Chocolate', color: '#593219' },
  { value: 'strawberry', label: 'Strawberry', color: '#f28ca8' },
  { value: 'cookie-dough', label: 'Cookie Dough', color: '#d8b07b' },
]

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
  const basePrice = 5
  const toppingPrice = toppings.find((topping) => topping.value === selectedTopping.value)?.price || 0
  const conePrice = cones.find((cone) => cone.value === selectedCone.value)?.price || 0

  return basePrice + toppingPrice + conePrice
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
let resizeObserver = null
let modelGroup = null
let previewStructure = null
let coneMesh = null
let scoopSourceMesh = null
let toppingMesh = null
let proceduralSprinklesGroup = null
let sceneReady = false

function getFlavorColor() {
  return flavors.find((flavor) => flavor.value === selectedFlavor.value)?.color || '#f5e3bc'
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

function buildMeshFacts(mesh) {
  const worldBox = new THREE.Box3().setFromObject(mesh)
  const size = worldBox.getSize(new THREE.Vector3())
  const center = worldBox.getCenter(new THREE.Vector3())
  const volume = size.x * size.y * size.z

  return {
    mesh,
    name: (mesh.name || '').toLowerCase(),
    materialNames: (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      .map((material) => (material?.name || '').toLowerCase())
      .join(' '),
    box: worldBox,
    size,
    center,
    volume,
  }
}

function identifyModelParts(meshes) {
  const facts = meshes.map((mesh) => buildMeshFacts(mesh))
  const sortedByMinY = [...facts].sort((left, right) => left.box.min.y - right.box.min.y)

  const cone = sortedByMinY[0] || null
  const remaining = facts.filter((fact) => fact !== cone)

  let scoop = null
  let topping = null

  if (remaining.length === 1) {
    scoop = remaining[0]
  }

  if (remaining.length >= 2) {
    const sortedByVolume = [...remaining].sort((left, right) => right.volume - left.volume)
    scoop = sortedByVolume[0]
    topping = sortedByVolume[sortedByVolume.length - 1]
  }

  if (!scoop && cone) {
    const coneHeight = cone.size.y
    const possibleScoops = facts
      .filter((fact) => fact !== cone)
      .filter((fact) => fact.size.y >= coneHeight * 0.45)
      .sort((left, right) => right.volume - left.volume)

    scoop = possibleScoops[0] || null
  }

  if (!topping && scoop) {
    const candidates = facts
      .filter((fact) => fact !== scoop && fact !== cone)
      .sort((left, right) => left.volume - right.volume)
    topping = candidates[0] || null
  }

  return {
    cone,
    scoop,
    topping,
  }
}

function ensureMeshMaterialClone(mesh) {
  if (!mesh?.material) {
    return
  }

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => material?.clone?.() || material)
    return
  }

  mesh.material = mesh.material.clone?.() || mesh.material
}

function createPreviewStructure() {
  const meshes = []
  modelGroup.traverse((object) => {
    if (object.isMesh) {
      meshes.push(object)
    }
  })

  if (!meshes.length) {
    throw new Error('No meshes found in ice-cream.glb')
  }

  const { cone, scoop, topping } = identifyModelParts(meshes)

  if (!cone || !scoop) {
    throw new Error('Could not identify cone and scoop meshes from GLB diagnostics')
  }

  coneMesh = cone.mesh
  scoopSourceMesh = scoop.mesh
  toppingMesh = topping?.mesh || null

  // Verberg het statische GLB topping mesh zodat we 3D sprinkles gebruiken
  if (toppingMesh) {
    toppingMesh.visible = false
  }

  const structure = new THREE.Group()
  structure.name = 'ice-cream-preview-structure'

  const coneGroup = new THREE.Group()
  coneGroup.name = 'cone'
  const scoopsGroup = new THREE.Group()
  scoopsGroup.name = 'scoops'
  const toppingsGroup = new THREE.Group()
  toppingsGroup.name = 'toppings'

  structure.add(coneGroup)
  structure.add(scoopsGroup)
  structure.add(toppingsGroup)
  modelGroup.add(structure)

  coneGroup.attach(coneMesh)
  scoopsGroup.attach(scoopSourceMesh)

  if (toppingMesh) {
    toppingsGroup.attach(toppingMesh)
  }

  ensureMeshMaterialClone(coneMesh)
  ensureMeshMaterialClone(scoopSourceMesh)

  proceduralSprinklesGroup = new THREE.Group()
  proceduralSprinklesGroup.name = 'procedural-sprinkles'
  toppingsGroup.add(proceduralSprinklesGroup)

  previewStructure = {
    root: structure,
    coneGroup,
    scoopsGroup,
    toppingsGroup,
  }
}

function applyConeStyle(coneType) {
  if (!coneMesh?.material) {
    return
  }

  const coneMaterial = createConeMaterial(coneType)
  const material = Array.isArray(coneMesh.material) ? coneMesh.material[0] : coneMesh.material

  if (!material) {
    return
  }

  material.color.set(coneMaterial.color)
  if ('roughness' in material) material.roughness = coneMaterial.roughness
  if ('metalness' in material) material.metalness = coneMaterial.metalness
  if ('clearcoat' in material) material.clearcoat = coneMaterial.clearcoat
  if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.15
}

function applyToppingStyle(toppingType) {
  if (!previewStructure || !proceduralSprinklesGroup || !scoopSourceMesh) {
    return
  }

  // Verwijder oude sprinkles bij topping wissel of 'none'
  while (proceduralSprinklesGroup.children.length > 0) {
    const child = proceduralSprinklesGroup.children[0]
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose())
      } else {
        child.material.dispose()
      }
    }
    proceduralSprinklesGroup.remove(child)
  }

  if (toppingType === 'none') {
    return
  }

  const colorPalettes = {
    chocolate: ['#3d2314', '#593219', '#2b180d'],
    sprinkles: ['#ff4081', '#ffeb3b', '#00e676', '#00b0ff', '#aa00ff', '#ff9100'],
    caramel: ['#d48817', '#e59b2b', '#b8730e'],
  }

  const palette = colorPalettes[toppingType] || ['#ff5f6d']

  // Bepaal de positie van de sprinkles bovenop de ijsbol
  const scoopBox = new THREE.Box3().setFromObject(scoopSourceMesh)
  const scoopCenter = scoopBox.getCenter(new THREE.Vector3())
  const scoopSize = scoopBox.getSize(new THREE.Vector3())

  const radiusX = scoopSize.x * 0.44
  const radiusZ = scoopSize.z * 0.44
  const topY = scoopBox.max.y

  const sprinkleCount = 30
  const sprinkleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6)

  for (let index = 0; index < sprinkleCount; index += 1) {
    const phi = (0.08 + (index / sprinkleCount) * 0.4) * Math.PI
    const theta = index * 2.3999632297286533 // Gouden ratio hoek

    const worldX = scoopCenter.x + radiusX * Math.sin(phi) * Math.cos(theta)
    const worldZ = scoopCenter.z + radiusZ * Math.sin(phi) * Math.sin(theta)
    const worldY = scoopCenter.y + (topY - scoopCenter.y) * Math.cos(phi) * 0.92 + 0.02

    const colorHex = palette[index % palette.length]
    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.4,
      metalness: 0.1,
    })

    const sprinkleMesh = new THREE.Mesh(sprinkleGeom, material)
    sprinkleMesh.castShadow = true
    sprinkleMesh.receiveShadow = true

    const worldPos = new THREE.Vector3(worldX, worldY, worldZ)
    const localPos = previewStructure.toppingsGroup.worldToLocal(worldPos)
    sprinkleMesh.position.copy(localPos)

    sprinkleMesh.rotation.x = Math.sin(index) * 0.8
    sprinkleMesh.rotation.y = theta
    sprinkleMesh.rotation.z = Math.cos(index) * 0.8

    proceduralSprinklesGroup.add(sprinkleMesh)
  }
}

function positionScoops() {
  if (!coneMesh || !scoopSourceMesh || !previewStructure) {
    return
  }

  scoopSourceMesh.position.set(0, 0, 0)

  const coneBox = new THREE.Box3().setFromObject(coneMesh)
  const scoopBox = new THREE.Box3().setFromObject(scoopSourceMesh)

  const coneCenter = coneBox.getCenter(new THREE.Vector3())
  const scoopCenter = scoopBox.getCenter(new THREE.Vector3())
  const scoopSize = scoopBox.getSize(new THREE.Vector3())

  const overlap = scoopSize.y * 0.18
  const targetScoopMinY = coneBox.max.y - overlap

  const deltaX = coneCenter.x - scoopCenter.x
  const deltaY = targetScoopMinY - scoopBox.min.y
  const deltaZ = coneCenter.z - scoopCenter.z

  scoopSourceMesh.position.set(deltaX, deltaY, deltaZ)
}

function applyCustomization() {
  if (!sceneReady || !modelGroup || !previewStructure) {
    return
  }

  const flavorColor = getFlavorColor()
  const scoopColor = new THREE.Color(flavorColor)

  if (scoopSourceMesh?.material) {
    const material = Array.isArray(scoopSourceMesh.material)
      ? scoopSourceMesh.material[0]
      : scoopSourceMesh.material

    if (material?.isMeshPhysicalMaterial || material?.isMeshStandardMaterial || material?.isMeshBasicMaterial) {
      material.color.set(scoopColor)
      if ('roughness' in material) material.roughness = 0.85
      if ('metalness' in material) material.metalness = 0.02
      if ('clearcoat' in material) material.clearcoat = 0.2
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.2
    }
  }

  applyConeStyle(selectedCone.value)
  positionScoops()
  applyToppingStyle(selectedTopping.value)
}

function fitCameraToModel() {
  if (!previewStructure || !camera || !controls) {
    return
  }

  // Reset modelGroup transform first so bounding box calculation is strictly deterministic
  modelGroup.position.set(0, 0, 0)
  modelGroup.scale.setScalar(1)

  const box = new THREE.Box3().setFromObject(previewStructure.root)
  const size = box.getSize(new THREE.Vector3())

  // Reduce model height by 20% (1.55 * 0.8 = 1.24)
  const targetHeight = 1.24
  const scale = size.y > 0 ? targetHeight / size.y : 1
  modelGroup.scale.setScalar(scale)

  const framedBox = new THREE.Box3().setFromObject(previewStructure.root)
  const framedCenter = framedBox.getCenter(new THREE.Vector3())

  // Center model perfectly in 3D world space at (0, 0, 0)
  modelGroup.position.x = -framedCenter.x
  modelGroup.position.y = -framedCenter.y
  modelGroup.position.z = -framedCenter.z

  // Maintain baseline camera distance based on original 1.55 size, and adjust for aspect ratio so model NEVER gets cut off on narrow screens
  const baselineRadius = size.y > 0 ? (1.55 / size.y) * Math.max(size.x, size.y, size.z) : 1.55
  const aspect = camera.aspect || 1
  const aspectMultiplier = aspect < 1 ? 1 / Math.max(aspect, 0.6) : 1
  const cameraDistance = baselineRadius * 2.7 * aspectMultiplier

  camera.position.set(0, 0, cameraDistance)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}

function resizeRenderer() {
  if (!renderer || !camera || !sceneHost.value) {
    return
  }

  const { clientWidth, clientHeight } = sceneHost.value
  if (clientWidth <= 0 || clientHeight <= 0) {
    return
  }

  renderer.setSize(clientWidth, clientHeight, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()

  if (sceneReady && previewStructure) {
    fitCameraToModel()
  }
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
      previewStructure = null
      coneMesh = null
      scoopSourceMesh = null
      toppingMesh = null

      modelGroup.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true
          object.receiveShadow = true
        }
      })

      createPreviewStructure()
      scene.add(modelGroup)
      sceneReady = true
      applyCustomization()
      fitCameraToModel()
      resizeRenderer()
    },
    undefined,
    () => {
      resizeRenderer()
    }
  )

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.enableZoom = false
  controls.maxPolarAngle = Math.PI * 0.56
  controls.target.set(0, 0, 0)

  resizeHandler = () => {
    resizeRenderer()
  }
  window.addEventListener('resize', resizeHandler)

  if (window.ResizeObserver && sceneHost.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeRenderer()
    })
    resizeObserver.observe(sceneHost.value)
  }

  animate()
  resizeRenderer()
})

watch([selectedFlavor, selectedCone, selectedTopping], () => {
  applyCustomization()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  resizeObserver?.disconnect()
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