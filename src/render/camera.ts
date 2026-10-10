// WHAT THIS FILE DOES
// Creates both cameras and lets you switch between them.
//   F = switch between the main city-builder camera and the debug free-fly camera
import type { Scene } from '@babylonjs/core/scene'
import { createRtsCamera } from './rtsCamera'
import { createFlyCamera } from './flyCamera'

export type CameraMode = 'rts' | 'fly'

export function createCameras(scene: Scene, canvas: HTMLCanvasElement) {
  const rts = createRtsCamera(scene, canvas)
  const fly = createFlyCamera(scene, canvas)
  let mode: CameraMode = 'rts'

  const setMode = (next: CameraMode) => {
    mode = next
    if (next === 'fly') {
      // Start flying from wherever the main camera is
      fly.camera.position.copyFrom(rts.camera.position)
      fly.camera.setTarget(rts.getFocus())
      rts.setEnabled(false)
      fly.setEnabled(true)
      scene.activeCamera = fly.camera
    } else {
      fly.setEnabled(false)
      rts.setEnabled(true)
      scene.activeCamera = rts.camera
    }
    window.dispatchEvent(new CustomEvent('cameramodechange', { detail: next }))
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !e.repeat) setMode(mode === 'rts' ? 'fly' : 'rts')
  })

  setMode('rts')
  return { rts, fly, getMode: () => mode }
}
