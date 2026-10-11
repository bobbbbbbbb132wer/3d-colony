// WHAT THIS FILE DOES
// A small toolbar for the terrain tools (Flatten, Excavate, brush size). Same as the Z / X / [ ] keys.
import { setHover } from '../core/uiHover'

export function createTerrainToolbar(root: HTMLElement) {
  const bar = document.createElement('div')
  bar.style.cssText =
    'position:fixed;left:12px;bottom:52px;display:flex;gap:6px;align-items:center;padding:6px 8px;' +
    'background:#000a;color:#fff;font:14px sans-serif;border-radius:6px'
  bar.addEventListener('pointerenter', () => setHover('terraintools', true))
  bar.addEventListener('pointerleave', () => setHover('terraintools', false))
  root.appendChild(bar)

  const button = (label: string, title: string, onClick: () => void) => {
    const b = document.createElement('button')
    b.textContent = label
    b.title = title
    b.style.cssText =
      'padding:3px 8px;background:#222c;color:#fff;border:1px solid #fff4;border-radius:5px;' +
      'font:14px sans-serif;cursor:pointer'
    b.addEventListener('click', () => {
      onClick()
      b.blur() // so Space/Enter don't re-press it
    })
    bar.appendChild(b)
    return b
  }
  const request = (name: string, detail: unknown) =>
    window.dispatchEvent(new CustomEvent(name, { detail }))

  const flatten = button('Flatten (Z)', 'Level the ground and blend it into the hills', () =>
    request('terraintoolrequest', 'flatten'),
  )
  const excavate = button('Excavate (X)', 'Dig the ground down', () =>
    request('terraintoolrequest', 'excavate'),
  )
  button('−', 'Smaller brush ( [ )', () => request('terrainbrushrequest', -0.5))
  const size = document.createElement('span')
  size.style.minWidth = '56px'
  size.style.textAlign = 'center'
  bar.appendChild(size)
  button('+', 'Bigger brush ( ] )', () => request('terrainbrushrequest', 0.5))

  window.addEventListener('terraintoolchange', (e) => {
    const { tool, radius } = (e as CustomEvent<{ tool: string | null; radius: number }>).detail
    flatten.style.borderColor = tool === 'flatten' ? '#4cf' : '#fff4'
    excavate.style.borderColor = tool === 'excavate' ? '#f92' : '#fff4'
    size.textContent = `Brush ${radius}`
  })
  size.textContent = 'Brush 4'
}
