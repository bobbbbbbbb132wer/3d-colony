import type { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'

export interface BuildingDef {
  id: string
  name: string
  // Create the building's meshes in the given scene. Same shapes as in-game.
  build: (scene: Scene) => void
}

function mat(scene: Scene, r: number, g: number, b: number) {
  const m = new StandardMaterial('m', scene)
  m.diffuseColor = new Color3(r, g, b)
  return m
}

// PLACEHOLDERS: replace with your real buildings (use the same ids as your simulation).
export const BUILDINGS: BuildingDef[] = [
  {
    id: 'wall',
    name: 'Wall',
    build: (s) => {
      const w = MeshBuilder.CreateBox('w', { width: 1, height: 1.2, depth: 0.3 }, s)
      w.material = mat(s, 0.6, 0.6, 0.65)
    },
  },
  {
    id: 'door',
    name: 'Door',
    build: (s) => {
      const d = MeshBuilder.CreateBox('d', { width: 0.9, height: 1.2, depth: 0.12 }, s)
      d.material = mat(s, 0.55, 0.35, 0.15)
      const k = MeshBuilder.CreateSphere('k', { diameter: 0.1 }, s)
      k.position.set(0.3, 0, -0.1)
      k.material = mat(s, 0.9, 0.8, 0.2)
    },
  },
  {
    id: 'table',
    name: 'Table',
    build: (s) => {
      const top = MeshBuilder.CreateBox('t', { width: 1.2, height: 0.1, depth: 0.7 }, s)
      top.position.y = 0.6
      top.material = mat(s, 0.6, 0.4, 0.2)
      for (const [x, z] of [
        [-0.5, -0.28],
        [0.5, -0.28],
        [-0.5, 0.28],
        [0.5, 0.28],
      ]) {
        const l = MeshBuilder.CreateBox('l', { width: 0.1, height: 0.6, depth: 0.1 }, s)
        l.position.set(x, 0.3, z)
        l.material = mat(s, 0.5, 0.33, 0.17)
      }
    },
  },
  {
    id: 'generator',
    name: 'Generator',
    build: (s) => {
      const b = MeshBuilder.CreateBox('b', { width: 1, height: 0.8, depth: 0.8 }, s)
      b.position.y = 0.4
      b.material = mat(s, 0.3, 0.5, 0.7)
      const c = MeshBuilder.CreateCylinder('c', { diameter: 0.3, height: 0.6 }, s)
      c.position.set(0.25, 1.05, 0)
      c.material = mat(s, 0.7, 0.7, 0.75)
    },
  },
]
