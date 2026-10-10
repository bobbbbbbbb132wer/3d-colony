import type { Engine } from '@babylonjs/core/Engines/engine'
import type { Scene } from '@babylonjs/core/scene'
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture'
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle'
import { Grid } from '@babylonjs/gui/2D/controls/grid'
import { Image as GuiImage } from '@babylonjs/gui/2D/controls/image'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock'
import { Control } from '@babylonjs/gui/2D/controls/control'
import { generateIcons } from './iconGenerator'
import { BUILDINGS } from './iconDefs'
import { THEME } from './theme'

export async function initBuildGui(engine: Engine, scene: Scene, onSelect: (id: string) => void) {
  // 1) make the icons (flat side-on view; use { angled: true } for a 3/4 look)
  let icons: Record<string, string> = {}
  try {
    icons = await generateIcons(engine, BUILDINGS, { size: 256, angled: false })
    console.log('icons generated:', Object.keys(icons))
  } catch (err) {
    console.error('icon generation failed:', err)
  }

  // 2) the GUI
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, scene)
  ui.idealHeight = 1080
  ui.renderAtIdealSize = true

  const { slot, pad, cols } = THEME
  const rows = Math.ceil(BUILDINGS.length / cols)
  const usedCols = Math.min(cols, BUILDINGS.length)
  const headerH = 34

  const panel = new Rectangle('buildPanel')
  panel.width = `${usedCols * slot + pad * 2}px`
  panel.height = `${rows * slot + pad * 2 + headerH}px`
  panel.background = THEME.panelBg
  panel.color = THEME.border
  panel.thickness = 2
  panel.cornerRadius = 10
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  panel.top = '-16px'
  panel.isPointerBlocker = true
  ui.addControl(panel)

  // header shows the hovered/selected building name
  const header = new TextBlock('header', 'Build (B to close)')
  header.color = THEME.text
  header.fontFamily = THEME.font
  header.fontSize = 18
  header.height = `${headerH}px`
  header.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  header.top = `${pad / 2}px`
  panel.addControl(header)

  const grid = new Grid('buildGrid')
  for (let c = 0; c < usedCols; c++) grid.addColumnDefinition(slot, true)
  for (let r = 0; r < rows; r++) grid.addRowDefinition(slot, true)
  grid.width = `${usedCols * slot}px`
  grid.height = `${rows * slot}px`
  grid.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  grid.top = `${-pad}px`
  panel.addControl(grid)

  let selected: Rectangle | null = null
  let selectedName = 'Build (B to close)'

  BUILDINGS.forEach((def, i) => {
    const s = new Rectangle(`slot_${def.id}`)
    s.width = `${slot - 8}px`
    s.height = `${slot - 8}px`
    s.background = THEME.slotBg
    s.color = THEME.border
    s.thickness = 2
    s.cornerRadius = 6
    s.isPointerBlocker = true
    s.hoverCursor = 'pointer'

    if (icons[def.id]) {
      const img = new GuiImage(`icon_${def.id}`, icons[def.id])
      img.width = '80px'
      img.height = '80px'
      img.stretch = GuiImage.STRETCH_UNIFORM
      img.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
      img.top = '4px'
      s.addControl(img)
    } else {
      // fallback so a failed icon is obvious instead of a blank slot
      const q = new TextBlock(`fallback_${def.id}`, '?')
      q.color = THEME.accent
      q.fontSize = 40
      s.addControl(q)
    }

    const label = new TextBlock(`label_${def.id}`, def.name)
    label.color = THEME.text
    label.fontFamily = THEME.font
    label.fontSize = 14
    label.height = '20px'
    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
    label.top = '-4px'
    s.addControl(label)

    s.onPointerEnterObservable.add(() => {
      if (s !== selected) s.color = THEME.text
      header.text = def.name
    })
    s.onPointerOutObservable.add(() => {
      if (s !== selected) s.color = THEME.border
      header.text = selectedName
    })
    s.onPointerClickObservable.add(() => {
      if (selected) selected.color = THEME.border
      selected = s
      selectedName = `Placing: ${def.name}`
      s.color = THEME.accent
      header.text = selectedName
      onSelect(def.id)
    })

    grid.addControl(s, Math.floor(i / cols), i % cols)
  })

  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b') panel.isVisible = !panel.isVisible
  })

  return { ui, panel }
}
