// WHAT THIS FILE DOES
// The main camera, city-builder style. It orbits an invisible focus point on the ground.
//   W A S D     = slide across the map (relative to where you are looking)
//   Q / E       = rotate the view
//   Mouse wheel = zoom in / out
//   Right-drag  = orbit and tilt
//   Shift       = move faster
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { CONFIG } from '../config'

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function createRtsCamera(scene: Scene, canvas: HTMLCanvasElement) {
  const camera = new FreeCamera('rtsCamera', Vector3.Zero(), scene)
  camera.inputs.clear() // we handle all input ourselves below
  camera.minZ = 0.1
  camera.maxZ = 1000

  // "goal" is where we want the camera to be. "now" is what you see (it glides to the goal).
  const goal = { x: 0, z: 0, yaw: 0, pitch: CONFIG.cameraStartPitch, zoom: CONFIG.cameraStartZoom }
  const now = { ...goal }

  const keys = new Set<string>()
  const focus = new Vector3()
  const halfMap = (CONFIG.mapSize * CONFIG.tileSize) / 2
  let enabled = true
  let orbiting = false

  // ----- keyboard -----
  window.addEventListener('keydown', (e) => keys.add(e.code))
  window.addEventListener('keyup', (e) => keys.delete(e.code))
  window.addEventListener('blur', () => keys.clear())

  // ----- mouse: right-drag to orbit -----
  canvas.addEventListener('pointerdown', (e) => {
    if (!enabled || e.button !== 2) return
    orbiting = true
    canvas.setPointerCapture(e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!enabled || !orbiting) return
    goal.yaw += toRadians(e.movementX * CONFIG.cameraOrbitSensitivity)
    goal.pitch = clamp(
      goal.pitch + e.movementY * CONFIG.cameraOrbitSensitivity,
      CONFIG.cameraMinPitch,
      CONFIG.cameraMaxPitch,
    )
  })
  const stopOrbit = () => (orbiting = false)
  canvas.addEventListener('pointerup', stopOrbit)
  canvas.addEventListener('pointercancel', stopOrbit)

  // ----- mouse wheel: zoom -----
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!enabled) return
      e.preventDefault()
      goal.zoom = clamp(
        goal.zoom * Math.exp(e.deltaY * CONFIG.cameraZoomSpeed),
        CONFIG.cameraMinZoom,
        CONFIG.cameraMaxZoom,
      )
    },
    { passive: false },
  )

  // ----- every frame -----
  scene.onBeforeRenderObservable.add(() => {
    if (!enabled) return
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1)

    // Rotate with Q / E
    if (keys.has('KeyQ')) goal.yaw -= toRadians(CONFIG.cameraRotateSpeed) * dt
    if (keys.has('KeyE')) goal.yaw += toRadians(CONFIG.cameraRotateSpeed) * dt

    // Slide with WASD, relative to the view direction
    let moveForward = 0
    let moveRight = 0
    if (keys.has('KeyW') || keys.has('ArrowUp')) moveForward += 1
    if (keys.has('KeyS') || keys.has('ArrowDown')) moveForward -= 1
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveRight += 1
    if (keys.has('KeyA') || keys.has('ArrowLeft')) moveRight -= 1
    const length = Math.hypot(moveForward, moveRight)
    if (length > 0) {
      const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? CONFIG.cameraFastMultiplier : 1
      const step = CONFIG.cameraPanSpeed * (goal.zoom / 20) * fast * dt
      const sin = Math.sin(goal.yaw)
      const cos = Math.cos(goal.yaw)
      goal.x += ((sin * moveForward + cos * moveRight) / length) * step
      goal.z += ((cos * moveForward - sin * moveRight) / length) * step
    }

    // Stay on the map
    goal.x = clamp(goal.x, -halfMap, halfMap)
    goal.z = clamp(goal.z, -halfMap, halfMap)

    // Glide toward the goal (same feel at any frame rate)
    const t = 1 - Math.exp(-CONFIG.cameraSmoothing * dt)
    now.x += (goal.x - now.x) * t
    now.z += (goal.z - now.z) * t
    now.yaw += (goal.yaw - now.yaw) * t
    now.pitch += (goal.pitch - now.pitch) * t
    now.zoom += (goal.zoom - now.zoom) * t

    // Place the camera on its orbit around the focus point
    const pitch = toRadians(now.pitch)
    const flat = Math.cos(pitch) * now.zoom
    camera.position.set(
      now.x - Math.sin(now.yaw) * flat,
      Math.sin(pitch) * now.zoom,
      now.z - Math.cos(now.yaw) * flat,
    )
    focus.set(now.x, 0, now.z)
    camera.setTarget(focus)
  })

  return {
    camera,
    setEnabled(on: boolean) {
      enabled = on
      if (!on) orbiting = false
    },
    getFocus: () => focus.clone(),
  }
}
