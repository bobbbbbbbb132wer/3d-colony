// WHAT THIS FILE DOES
// The world as pure data: what the colony owns, what is unlocked, and later tiles and colonists.
// RULE: never import Babylon in the sim folder.
import { BUILDINGS } from './buildings'

export interface World {
  /** What the colony owns, e.g. { wood: 20 }. */
  resources: Record<string, number>
  /** Ids of the buildings the player has unlocked. */
  unlockedBuildings: string[]
}

export function createWorld(): World {
  return {
    resources: { wood: 20, stone: 3, metal: 0 },
    unlockedBuildings: BUILDINGS.filter((b) => b.startsUnlocked).map((b) => b.id),
  }
}
