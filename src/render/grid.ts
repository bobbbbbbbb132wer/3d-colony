// WHAT THIS FILE DOES
// Draws the flat ground and the grid lines on top of it.
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Scene } from '@babylonjs/core/scene'
import { CONFIG } from '../config'

export function createGrid(scene: Scene) {
  const size = CONFIG.mapSize * CONFIG.tileSize
  const half = size / 2

  // Flat green ground
  const ground = MeshBuilder.CreateGround('ground', { width: size, height: size }, scene)
  const groundMaterial = new StandardMaterial('groundMaterial', scene)
  groundMaterial.diffuseColor = new Color3(0.25, 0.5, 0.25)
  groundMaterial.specularColor = Color3.Black()
  ground.material = groundMaterial

  // Grid lines, drawn just above the ground so they don't flicker
  const lines: Vector3[][] = []
  for (let i = 0; i <= CONFIG.mapSize; i++) {
    const p = -half + i * CONFIG.tileSize
    lines.push([new Vector3(p, 0.01, -half), new Vector3(p, 0.01, half)])
    lines.push([new Vector3(-half, 0.01, p), new Vector3(half, 0.01, p)])
  }
  const gridLines = MeshBuilder.CreateLineSystem('gridLines', { lines }, scene)
  gridLines.color = new Color3(0.1, 0.25, 0.1)
  gridLines.isPickable = false

  return { ground, gridLines }
}
