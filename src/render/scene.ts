// WHAT THIS FILE DOES
// Creates the 3D window: engine, scene, light, cameras and grid.
import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { createCameras } from './camera'
import { generateTerrain, setTerrain, WORLD_SIZE } from '../sim/terrain'
import { scatterScenery } from '../sim/scenery'
import { createTerrainMesh } from './terrain'
import { spawnScenery } from './scenery'

export interface View {
  engine: Engine
  scene: Scene
  cameras: ReturnType<typeof createCameras>
}

export async function createScene(container: HTMLElement): Promise<View> {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'width:100%;height:100%;display:block;outline:none'
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  container.appendChild(canvas)

  const engine = new Engine(canvas, true)
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.55, 0.75, 0.95, 1) // sky blue

  new HemisphericLight('sun', new Vector3(0.3, 1, 0.2), scene)

  const cameras = createCameras(scene, canvas)
  // Same seed = same world. Try http://localhost:5173/?seed=42 for a different one.
  const seed = Number(new URLSearchParams(location.search).get('seed')) || 1337
  const terrain = generateTerrain(seed, WORLD_SIZE)
  scatterScenery(terrain)
  setTerrain(terrain)
  createTerrainMesh(scene, terrain)
  spawnScenery(scene, terrain).catch((error) => console.error('Scenery failed:', error))

  window.addEventListener('resize', () => engine.resize())
  return { engine, scene, cameras }
}
