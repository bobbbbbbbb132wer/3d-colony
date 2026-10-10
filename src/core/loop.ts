// WHAT THIS FILE DOES
// The game's heartbeat. Many times per second it updates the world, then redraws the picture.

// Fixed-timestep sim tick, separate from render frames
import type { World } from '../sim/world'
import type { View } from '../render/scene'

export function startLoop(_world: World, _view: View) {
  // TODO: fixed tick for sim, render every frame
}
