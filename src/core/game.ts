// WHAT THIS FILE DOES
// Connects all the parts: the world data, the 3D picture, the buttons, and the game loop.
// Think of it as the person who introduces everyone at a party.

// Wires everything together: world (sim) + scene (render) + ui + loop
import { createWorld } from '../sim/world'
import { createScene } from '../render/scene'
import { initUI } from '../ui/ui'
import { startLoop } from './loop'

export async function startGame() {
  const world = createWorld()
  const view = await createScene(document.getElementById('app')!)
  initUI(document.getElementById('ui')!)
  startLoop(world, view)
}
