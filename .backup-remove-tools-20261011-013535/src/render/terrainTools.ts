// WHAT THIS FILE DOES
// The flatten and excavate tools. Hold the left mouse button and drag over the ground.
//   Z = flatten tool    X = excavate tool    [ and ] = smaller / bigger brush
//   Right-click or Escape = put the tool away
// They edit the real terrain heights (sim/terrainEdit.ts), then refresh the 3D mesh to match.
import type { Scene } from '@babylonjs/core/scene'
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh'
import '@babylonjs/core/Culling/ray' // needed for createPickingRay
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import { getTerrain, heightAt, raycastGround } from '../sim/terrain'
import { brushChanges, commitChanges, type BrushMode, type TileTaken } from '../sim/terrainEdit'
import { syncTerrainMesh } from './terrain'

const MIN_RADIUS = 1.5
const MAX_RADIUS = 12
const RING_POINTS = 64

export function initTerrainTools(scene: Scene, taken: TileTaken, cancelPlacement: () => void) {
  let tool: BrushMode | null = null
  let radius = 4
  let stroking = false
  let target = 0
  let menuHover = false
  let ring: LinesMesh | null = null
  let rightDown: { x: number; y: number } | null = null
  const engine = scene.getEngine()

  const note = (text: string) =>
    window.dispatchEvent(new CustomEvent('placementstatus', { detail: text }))
  const announce = () => {
    window.dispatchEvent(new CustomEvent('terraintoolchange', { detail: { tool, radius } }))
    if (!tool) return note('')
    const name = tool === 'flatten' ? 'Flatten' : 'Excavate'
    note(
      `${name}: hold left-click and drag | [ ] brush size ${radius} | Esc or right-click to stop`,
    )
  }

  function setTool(next: BrushMode | null) {
    if (next) cancelPlacement() // one thing at a time: tools and building placement
    tool = next === tool ? null : next
    stroking = false
    if (ring) ring.setEnabled(false)
    announce()
  }

  function setRadius(r: number) {
    radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, r))
    announce()
  }

  function groundPoint(): Vector3 | null {
    const cam = scene.activeCamera
    const terrain = getTerrain()
    if (!cam || !terrain) return null
    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), cam)
    const hit = raycastGround(
      terrain,
      ray.origin.x,
      ray.origin.y,
      ray.origin.z,
      ray.direction.x,
      ray.direction.y,
      ray.direction.z,
    )
    return hit ? new Vector3(hit.x, hit.y, hit.z) : null
  }

  const usable = () => !!tool && !menuHover && !document.pointerLockElement

  function updateRing(p: Vector3 | null) {
    const t = getTerrain()
    if (!p || !t || !tool) {
      ring?.setEnabled(false)
      return
    }
    const points: Vector3[] = []
    for (let k = 0; k <= RING_POINTS; k++) {
      const a = (k / RING_POINTS) * Math.PI * 2
      const x = p.x + Math.cos(a) * radius
      const z = p.z + Math.sin(a) * radius
      points.push(new Vector3(x, heightAt(t, x, z) + 0.15, z))
    }
    ring = ring
      ? MeshBuilder.CreateLines('brushRing', { points, instance: ring })
      : MeshBuilder.CreateLines('brushRing', { points, updatable: true }, scene)
    ring.color = tool === 'flatten' ? new Color3(0.3, 0.8, 1) : new Color3(1, 0.6, 0.2)
    ring.isPickable = false
    ring.setEnabled(true)
  }

  scene.onBeforeRenderObservable.add(() => {
    if (!usable()) {
      updateRing(null)
      stroking = false
      return
    }
    const p = groundPoint()
    updateRing(p)
    const t = getTerrain()
    if (!stroking || !p || !t || !tool) return
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    const changes = brushChanges(t, p.x, p.z, radius, tool, target, dt, (ti, tj) => taken(ti, tj))
    const bounds = commitChanges(t, changes)
    if (bounds) syncTerrainMesh(scene, t, bounds)
  })

  scene.onPointerObservable.add((info) => {
    if (!tool) return
    const e = info.event as PointerEvent
    if (info.type === PointerEventTypes.POINTERDOWN) {
      if (e.button === 0 && usable()) {
        const p = groundPoint()
        const t = getTerrain()
        if (p && t) {
          target = heightAt(t, p.x, p.z) // flatten pulls the ground to the height you clicked
          stroking = true
        }
      } else if (e.button === 2) rightDown = { x: e.clientX, y: e.clientY }
    } else if (info.type === PointerEventTypes.POINTERUP) {
      if (e.button === 0) stroking = false
      else if (e.button === 2 && rightDown) {
        if (Math.hypot(e.clientX - rightDown.x, e.clientY - rightDown.y) < 5) setTool(null)
        rightDown = null
      }
    }
  })

  window.addEventListener('buildmenuhover', (e) => {
    menuHover = (e as CustomEvent<boolean>).detail
  })
  // picking a building from the menu puts the terrain tool away
  window.addEventListener('buildingpicked', () => {
    if (tool) setTool(null)
  })
  // the toolbar buttons
  window.addEventListener('terraintoolrequest', (e) =>
    setTool((e as CustomEvent<BrushMode>).detail),
  )
  window.addEventListener('terrainbrushrequest', (e) =>
    setRadius(radius + (e as CustomEvent<number>).detail),
  )

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.code === 'Escape' && tool) setTool(null)
    else if (e.code === 'BracketLeft') setRadius(radius - 0.5)
    else if (e.code === 'BracketRight') setRadius(radius + 0.5)
    else if (e.repeat) return
    else if (e.code === 'KeyZ') setTool('flatten')
    else if (e.code === 'KeyX') setTool('excavate')
  })

  return { setTool }
}
