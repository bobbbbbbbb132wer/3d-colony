// WHAT THIS FILE DOES
// TEMPORARY: puts one campfire in the middle of the map to prove models load
// from the single offline HTML. Delete this file (and its line in scene.ts) when
// real placing is built.
import type { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { loadModel } from './assetLoader'
import { addCampfireEffects } from './campfireEffects'

export async function addTestCampfire(scene: Scene) {
  const { meshes, transformNodes } = await loadModel(scene, 'campfire')
  const root = meshes[0]

  // Shrink or grow it to about 2 tiles wide, then sit it on the ground
  const first = root.getHierarchyBoundingVectors(true)
  root.scaling.scaleInPlace(2 / (first.max.x - first.min.x))
  root.computeWorldMatrix(true)
  const second = root.getHierarchyBoundingVectors(true)
  root.position.y -= second.min.y

  addCampfireEffects(scene, [...meshes, ...transformNodes], Vector3.Zero())
}
