// WHAT THIS FILE DOES
// Loads 3D models and textures that you drop into src/assets.

// Loads embedded models/textures from data URLs. Needs: npm i @babylonjs/loaders
import type { Scene } from '@babylonjs/core/scene'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { models, textures } from '../assets'

export async function loadModel(scene: Scene, name: string) {
  const url = models[name]
  if (!url) throw new Error(`Model not found: ${name}`)
  const ext = url.startsWith('data:model/obj') ? '.obj' : '.glb'
  return SceneLoader.ImportMeshAsync('', '', url, scene, undefined, ext)
}

export function loadTexture(scene: Scene, name: string) {
  const url = textures[name]
  if (!url) throw new Error(`Texture not found: ${name}`)
  return new Texture(url, scene)
}
