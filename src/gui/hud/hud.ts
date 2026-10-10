// WHAT THIS FILE DOES
// Always-on screen info. For now: the colony's resources, top left.
import type { World } from '../../sim/world'
import { RESOURCES } from '../../sim/buildings'

export function createHud(root: HTMLElement, world: World) {
  const box = document.createElement('div')
  box.style.cssText =
    'position:fixed;top:12px;left:12px;padding:6px 10px;background:#000a;color:#fff;' +
    'font:14px monospace;border-radius:6px;pointer-events:none;white-space:pre'
  root.appendChild(box)

  const update = () => {
    box.textContent = Object.entries(world.resources)
      .map(([id, amount]) => `${RESOURCES[id]?.icon ?? id} ${amount}`)
      .join('   ')
  }
  update()
  setInterval(update, 250)
}
