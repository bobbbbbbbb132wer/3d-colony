# Start here

## What is where?
| Folder        | In plain words                                   |
|---------------|--------------------------------------------------|
| src/config.ts | All the numbers you can tweak                    |
| src/sim/      | The game's brain: data and rules (no 3D)         |
| src/render/   | The game's eyes: draws the data in 3D            |
| src/ui/       | Buttons and menus                                |
| src/physics/  | Falling, bouncing, collisions                    |
| src/save/     | Save and load                                    |
| src/assets/   | Drop models, textures, sounds here               |
| src/core/     | Glue that connects everything                    |

## The one big rule
The brain (sim) never touches the eyes (render).
Sim holds the facts. Render only reads them and draws.
This keeps saving, speed controls and bug-fixing simple.

## Commands
- `npm run dev`     start the game while you work
- `npm run build`   make the single offline file at dist/index.html
- `npm run check`   look for mistakes
- `npm run format`  tidy all the code

## Recipes
**Add a new model:** put `thing.glb` in src/assets/models, then call `loadModel(scene, 'thing')`.
**Change map size:** edit `mapSize` in src/config.ts.
**Add a new tile type:** add it to src/sim/tile.ts, then give it a colour in src/render/grid.ts.
**Add a new button:** edit src/ui/ui.ts.

## Before you save your work
Run `npm run check` and `npm run format`. Then commit.
