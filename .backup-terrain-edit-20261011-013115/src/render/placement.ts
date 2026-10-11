// WHAT THIS FILE DOES
// Placement mode: a ghost model follows the mouse over the ground (green = ok, red = blocked
// or too expensive). Left-click places a construction site that takes a few seconds, then the
// real model appears. Click = place once, Shift+click = keep placing, R rotates,
// Escape or a quick right-click cancels.
import type { Engine } from '@babylonjs/core/Engines/engine'
import type { Scene } from '@babylonjs/core/scene'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import '@babylonjs/core/Rendering/outlineRenderer' // needed for the ghost tint and outline
import '@babylonjs/core/Culling/ray' // needed for createPickingRay (mouse to ground)
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import { models } from '../assets'
import { loadModel } from './assetLoader'
import { addCampfireEffects } from './campfireEffects'
import { BUILDINGS, canAfford } from '../sim/buildings'
import { buildSeconds, metaOf } from '../sim/buildingMeta'
import {
  addSite,
  createConstruction,
  overlaps,
  progress,
  tick,
  type Footprint,
  type Site,
} from '../sim/construction'
import type { World } from '../sim/world'
import { footprintBuildable, footprintHeight, getTerrain, raycastGround } from '../sim/terrain'
import { consume, reserve } from '../sim/resources'

interface Model {
  holder: TransformNode
  meshes: AbstractMesh[]
  nodes: TransformNode[]
}

interface Active {
  id: string
  rot: number
  model: Model
  fp: Footprint | null
  valid: boolean | null
}

interface SiteVisual {
  root: TransformNode
  box: Mesh
  fill: Mesh
}

// Loads a building's model, sizes it to its footprint, centres it and sits it on the ground.
async function loadBuildingModel(scene: Scene, id: string, width: number): Promise<Model> {
  const holder = new TransformNode(`b_${id}`, scene)
  if (!(id in models)) {
    const m = metaOf(id)
    const box = MeshBuilder.CreateBox('fallback', { width: m.w, depth: m.d, height: 1 }, scene)
    box.parent = holder
    box.position.y = 0.5
    return { holder, meshes: [box], nodes: [] }
  }
  const { meshes, transformNodes } = await loadModel(scene, id)
  const root = meshes[0]
  root.parent = holder
  const first = root.getHierarchyBoundingVectors(true)
  root.scaling.scaleInPlace(width / (first.max.x - first.min.x))
  root.computeWorldMatrix(true)
  const b = root.getHierarchyBoundingVectors(true)
  root.position.x -= (b.min.x + b.max.x) / 2
  root.position.z -= (b.min.z + b.max.z) / 2
  root.position.y -= b.min.y
  return { holder, meshes, nodes: transformNodes }
}

// Snap to the tile grid: odd sizes centre on a tile, even sizes sit on a grid line.
const snap = (v: number, size: number) => (size % 2 === 0 ? Math.round(v) : Math.floor(v) + 0.5)

// Height of the ground under a footprint, and whether it is flat and free to build on.
function groundY(fp: Footprint) {
  const t = getTerrain()
  return t ? footprintHeight(t, fp) : 0
}
function canBuildAt(fp: Footprint) {
  const t = getTerrain()
  return t ? footprintBuildable(t, fp) : true
}

export function initPlacement(engine: Engine, scene: Scene, world: World) {
  const con = createConstruction()
  const visuals = new Map<number, SiteVisual>()
  let active: Active | null = null
  let token = 0
  let menuHover = false

  const green = new Color3(0.2, 0.9, 0.3)
  const red = new Color3(0.95, 0.2, 0.2)

  const solid = (hex: string, alpha = 1) => {
    const m = new StandardMaterial('m', scene)
    m.emissiveColor = Color3.FromHexString(hex)
    m.disableLighting = true
    m.backFaceCulling = false
    m.alpha = alpha
    return m
  }

  // Where the mouse points on the ground (y = 0). Returns null if the ray misses it.
  function groundPoint(): Vector3 | null {
    const cam = scene.activeCamera
    if (!cam) return null
    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), cam)
    const terrain = getTerrain()
    if (terrain) {
      const o = ray.origin
      const d = ray.direction
      const hit = raycastGround(terrain, o.x, o.y, o.z, d.x, d.y, d.z)
      return hit ? new Vector3(hit.x, hit.y, hit.z) : null
    }
    if (Math.abs(ray.direction.y) < 1e-6) return null
    const t = -ray.origin.y / ray.direction.y
    if (t < 0) return null
    return ray.origin.add(ray.direction.scale(t))
  }

  function footprintAt(id: string, rot: number, p: Vector3): Footprint {
    const m = metaOf(id)
    const swap = rot % 2 === 1
    const w = swap ? m.d : m.w
    const d = swap ? m.w : m.d
    return { x: snap(p.x, w), z: snap(p.z, d), w, d }
  }

  function tint(a: Active, ok: boolean) {
    if (a.valid === ok) return
    a.valid = ok
    const c = ok ? green : red
    for (const m of a.model.meshes) {
      if (m.getTotalVertices() === 0) continue
      m.renderOverlay = true
      m.overlayColor = c
      m.overlayAlpha = 0.3
      m.renderOutline = true
      m.outlineColor = c
      m.outlineWidth = 0.04
    }
  }

  // Runs every frame while placing: ghost follows the cursor, or hides when there is no ground.
  let warned = false
  function refresh() {
    try {
      refreshInner()
    } catch (err) {
      if (!warned) console.error('placement refresh failed:', err)
      warned = true
    }
  }

  function refreshInner() {
    if (!active) return
    const p = menuHover || document.pointerLockElement ? null : groundPoint()
    if (!p) {
      active.fp = null
      active.valid = null
      active.model.holder.setEnabled(false)
      return
    }
    const fp = footprintAt(active.id, active.rot, p)
    active.fp = fp
    active.model.holder.setEnabled(true)
    active.model.holder.position.set(fp.x, groundY(fp), fp.z)
    active.model.holder.rotation.y = (active.rot * Math.PI) / 2
    const def = BUILDINGS.find((b) => b.id === active!.id)
    tint(active, !!def && canAfford(world, def) && !overlaps(con, fp) && canBuildAt(fp))
  }

  async function start(id: string) {
    cancel()
    // Placement needs the real cursor: release the mouse if free-fly had it locked
    if (document.pointerLockElement) document.exitPointerLock()
    const mine = ++token
    try {
      const model = await loadBuildingModel(scene, id, metaOf(id).w)
      if (mine !== token) {
        model.holder.dispose()
        return
      }
      for (const m of model.meshes) {
        m.isPickable = false // the ghost never blocks its own placement
        m.visibility = 0.5
      }
      active = { id, rot: 0, model, fp: null, valid: null }
      refresh()
    } catch (err) {
      console.error(`could not start placing ${id}:`, err)
    }
  }

  function cancel() {
    token++
    if (active) {
      active.model.holder.dispose()
      active = null
    }
  }

  function makeSiteVisual(site: Site) {
    const root = new TransformNode(`site_${site.uid}`, scene)
    root.position.set(site.x, groundY(site), site.z)

    const box = MeshBuilder.CreateBox('site', { width: site.w, depth: site.d, height: 1 }, scene)
    box.parent = root
    box.material = solid('#f0a030', 0.45)
    box.isPickable = false

    const bar = new TransformNode('bar', scene)
    bar.parent = root
    bar.position.y = 2.2
    bar.billboardMode = TransformNode.BILLBOARDMODE_ALL

    const bg = MeshBuilder.CreatePlane('barbg', { width: 1.2, height: 0.14 }, scene)
    bg.parent = bar
    bg.position.z = 0.01
    bg.material = solid('#1a1f26')
    bg.isPickable = false

    const fill = MeshBuilder.CreatePlane('barfill', { width: 1.2, height: 0.14 }, scene)
    fill.parent = bar
    fill.position.z = -0.01
    fill.material = solid('#7fe06a')
    fill.isPickable = false

    visuals.set(site.uid, { root, box, fill })
  }

  function updateSiteVisual(site: Site) {
    const v = visuals.get(site.uid)
    if (!v) return
    const p = Math.min(Math.max(progress(site), 0), 1)
    v.box.scaling.y = 0.2 + 1.2 * p
    v.box.position.y = v.box.scaling.y / 2
    v.fill.scaling.x = Math.max(p, 0.001)
    v.fill.position.x = -0.6 * (1 - p)
  }

  async function spawn(site: Site) {
    try {
      const model = await loadBuildingModel(scene, site.id, metaOf(site.id).w)
      model.holder.position.set(site.x, groundY(site), site.z)
      model.holder.rotation.y = (site.rot * Math.PI) / 2
      if (site.id === 'campfire') {
        addCampfireEffects(
          scene,
          [...model.meshes, ...model.nodes],
          new Vector3(site.x, groundY(site), site.z),
        )
      }
    } catch (err) {
      console.error(`could not finish building ${site.id}:`, err)
    }
  }

  // Places at the ghost's exact position (no recalculation). Returns true if it worked.
  function place(): boolean {
    if (!active || menuHover || !active.fp || !active.valid) return false
    const def = BUILDINGS.find((b) => b.id === active!.id)
    if (!def) return false
    reserve(def.cost)
    const site = addSite(con, active.id, active.fp, active.rot, buildSeconds(active.id))
    makeSiteVisual(site)
    active.valid = null // re-check next frame: we may not afford another one now
    return true
  }

  // Mouse: left = place (Shift keeps placing), quick right-click = cancel, wheel = camera only
  let rightDown: { x: number; y: number } | null = null
  scene.onPointerObservable.add((info) => {
    if (!active) return
    const e = info.event as PointerEvent
    if (info.type === PointerEventTypes.POINTERDOWN) {
      if (e.button === 0) {
        if (place() && !e.shiftKey) cancel()
      } else if (e.button === 2) rightDown = { x: e.clientX, y: e.clientY }
    } else if (info.type === PointerEventTypes.POINTERUP && e.button === 2 && rightDown) {
      if (Math.hypot(e.clientX - rightDown.x, e.clientY - rightDown.y) < 5) cancel()
      rightDown = null
    }
  })

  // The menu tells us when the mouse is over it, so the ghost hides and clicks don't place
  window.addEventListener('buildmenuhover', (e) => {
    menuHover = (e as CustomEvent<boolean>).detail
  })

  window.addEventListener('keydown', (e) => {
    if (!active) return
    if (e.key === 'Escape') cancel()
    else if (e.key.toLowerCase() === 'r') {
      active.rot = (active.rot + 1) % 4
      active.valid = null
    }
  })

  // Every frame: move the ghost, advance construction, update scaffolds, swap in finished buildings
  scene.onBeforeRenderObservable.add(() => {
    refresh()
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    const done = tick(con, dt)
    for (const s of con.sites) updateSiteVisual(s)
    for (const s of done) {
      const cost = BUILDINGS.find((b) => b.id === s.id)?.cost
      if (cost) consume(world, cost)
      visuals.get(s.uid)?.root.dispose()
      visuals.delete(s.uid)
      void spawn(s)
    }
  })

  return { start, cancel }
}
