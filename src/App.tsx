import { CutIcon, CutPicker } from '@/components/CutIcon'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BringToFront, Circle, Clapperboard, CopyPlus, Download, Frame, Grid3x3, ImagePlus, Images, Layers2, Play, Plus, SendToBack, Shuffle, Square, SquareMousePointer, Trash2, Undo2, Waves, X } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToolButton } from '@/components/shell/ToolButton'
import { Toolbar, ToolbarSeparator } from '@/components/shell/Toolbar'
import { OnOff, Segmented } from '@/components/shell/Segmented'
import { Field, FieldGroup } from '@/components/shell/Field'
import { Swatches } from '@/components/shell/Swatches'
import { Splash } from '@/components/shell/Splash'
import { PanelRail } from '@/components/shell/PanelRail'
import { PanelSheet } from '@/components/shell/PanelSheet'
import { ActionDock } from '@/components/shell/ActionDock'
import { PANEL_W, PHONE_SHEET, usePhone } from '@/components/shell/layout'
import { Stage } from '@/components/Stage'
import { prepareImage, type Img } from '@/render'
import {
  BG_SWATCHES, CUTS, type Cut, cutPiece, defaultScene, FORMATS, height, imagePiece, migratePiece, migrateTexture, newId, randomise, shapePiece, SWATCHES,
  type AnimStyle, type CrossStyle, type Format, type Piece, type Scene,
} from '@/scene'
import { deleteImage, deleteTextureFile, loadImage, loadScene, loadTextureFile, loadTextureList, saveImage, saveScene, saveTextureFile, saveTextureList } from '@/store'
import { BLENDS, BUILTIN_ORDER, builtinTextures, forgetTexture, loadScans, userTexture, type Blend, type TextureLayer, type TextureSource } from '@/textures'
import { TexturePicker } from '@/components/TexturePicker'
import { download, exportPng, exportVideo } from '@/export'
import { fetchSample, pickSamples } from '@/samples'

const panels = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'piece', label: 'Piece', icon: SquareMousePointer },
  { id: 'canvas', label: 'Canvas', icon: Frame },
  { id: 'texture', label: 'Texture', icon: Waves },
  { id: 'motion', label: 'Motion', icon: Clapperboard },
  { id: 'export', label: 'Export', icon: Download },
] as const
type PanelId = (typeof panels)[number]['id']

function Range({ label, value, onChange, onCommit }: { label: string; value: number; onChange: (v: number) => void; onCommit?: () => void }) {
  return (
    <Field label={label}>
      <Slider aria-label={label} min={0} max={1} step={0.01} value={[value]} onValueChange={([v]) => onChange(v)} onValueCommit={onCommit} />
    </Field>
  )
}

function decode(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = URL.createObjectURL(blob)
  })
}

export default function App() {
  const [scene, setScene] = useState<Scene>(defaultScene)
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [version, setVersion] = useState(0)
  const [note, setNote] = useState('')
  const [play, setPlay] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const images = useRef(new Map<string, Img>())
  // Texture sources: the built-ins, plus scans you load (kept in this browser, never published)
  const [textures, setTextures] = useState<Map<string, TextureSource>>(() => new Map(builtinTextures().map(t => [t.id, t])))
  const textureList = [...textures.values()]
  useEffect(() => {
    // The paper scans that ship with the app arrive in the background; built-ins stay first, in order
    loadScans().then(scans => setTextures(m => {
      const built = [...builtinTextures(), ...scans].sort((a, b) => BUILTIN_ORDER.indexOf(a.id) - BUILTIN_ORDER.indexOf(b.id))
      return new Map([...built.map(t => [t.id, t] as const), ...[...m].filter(([, t]) => t.user)])
    }))
    loadTextureList().then(async list => {
      for (const t of list ?? []) {
        const blob = await loadTextureFile(t.id)
        if (!blob) continue
        const src = userTexture(t.id, t.name, await decode(blob))
        setTextures(m => new Map(m).set(src.id, src))
      }
    })
  }, [])
  const addTexture = async (file: File): Promise<string | null> => {
    try {
      const id = `t${newId()}`, src = userTexture(id, file.name.replace(/\.[^.]+$/, ''), await decode(file))
      saveTextureFile(id, file)
      setTextures(m => {
        const next = new Map(m).set(id, src)
        saveTextureList([...next.values()].filter(t => t.user).map(t => ({ id: t.id, name: t.name })))
        return next
      })
      return id
    } catch {
      setNote('Couldn’t read that texture')
      return null
    }
  }
  const removeTexture = (id: string) => {
    deleteTextureFile(id); forgetTexture(id)
    setTextures(m => {
      const next = new Map(m); next.delete(id)
      saveTextureList([...next.values()].filter(t => t.user).map(t => ({ id: t.id, name: t.name })))
      return next
    })
    // Anything using it goes back to no texture
    setScene(sc => ({
      ...sc,
      texture: { ...sc.texture, layers: sc.texture.layers.filter(l => l.source !== id) },
      pieces: sc.pieces.map(p => (p.tex?.source === id ? { ...p, tex: null } : p)),
    }))
  }
  const history = useRef<Scene[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const phone = usePhone()

  const piece = scene.pieces.find(p => p.id === selected) ?? null
  const H = height(scene)

  // ---------- Saving and history ----------
  // Restore the last collage (scene, then each image's original file)
  useEffect(() => {
    loadScene().then(async s => {
      if (s?.pieces) {
        // Saved on the old default off-black, move to the shared one
        setScene({ ...defaultScene, ...s, bg: s.bg === '#0e0e0e' ? '#141414' : s.bg, pieces: s.pieces.map(migratePiece), texture: migrateTexture(s.texture), anim: { ...defaultScene.anim, ...s.anim } })
        for (const p of s.pieces) if (p.imageId && !images.current.has(p.imageId)) {
          const blob = await loadImage(p.imageId)
          if (blob) { images.current.set(p.imageId, prepareImage(await decode(blob))); setVersion(v => v + 1) }
        }
      }
      setLoaded(true)
    })
  }, [])
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => saveScene(scene), 400)
    return () => clearTimeout(t)
  }, [scene, loaded])

  // Changes build on the latest scene (a ref), not the last one drawn: two changes between redraws,
  // like quick clicks or an image finishing loading, would otherwise overwrite each other
  const latest = useRef(scene)
  latest.current = scene
  const commit = useCallback((change: (s: Scene) => Scene) => {
    const cur = latest.current, next = change(cur)
    history.current = [...history.current.slice(-49), cur]
    latest.current = next
    setScene(next)
  }, [])
  const undo = useCallback(() => {
    const prev = history.current.pop()
    if (prev) { setScene(prev); setNote('Undone') }
  }, [])
  // During a drag the scene changes on every move; the step for undo is taken when it began
  const gestureStart = useRef<Scene | null>(null)
  const livePatch = (id: string, patch: Partial<Piece>) => {
    if (!gestureStart.current) gestureStart.current = latest.current
    setScene(s => ({ ...s, pieces: s.pieces.map(p => (p.id === id ? { ...p, ...patch } : p)) }))
  }
  const endGesture = () => {
    if (gestureStart.current) history.current = [...history.current.slice(-49), gestureStart.current]
    gestureStart.current = null
  }
  const updatePiece = (patch: Partial<Piece>) => piece && livePatch(piece.id, patch)
  const setAnim = (patch: Partial<Scene['anim']>) => setScene(s => ({ ...s, anim: { ...s.anim, ...patch } }))
  const setLayer = (i: number, patch: Partial<TextureLayer>) => {
    if (!gestureStart.current) gestureStart.current = latest.current
    setScene(s => ({ ...s, texture: { ...s.texture, layers: s.texture.layers.map((l, j) => (j === i ? { ...l, ...patch } : l)) } }))
  }
  const addLayer = (source: string, blend: Blend = 'multiply') =>
    commit(s => ({ ...s, texture: { ...s.texture, layers: [...s.texture.layers, { source, blend, amount: 0.4, scale: 1, colour: 'neutral' }] } }))
  const removeLayer = (i: number) => commit(s => ({ ...s, texture: { ...s.texture, layers: s.texture.layers.filter((_, j) => j !== i) } }))
  const setTexture = (patch: Partial<Scene['texture']>) => {
    if (!gestureStart.current) gestureStart.current = scene
    setScene(s => ({ ...s, texture: { ...s.texture, ...patch } }))
  }

  // ---------- Adding ----------
  const centre = () => ({ x: 0.5 + (Math.random() - 0.5) * 0.12, y: H / 2 + (Math.random() - 0.5) * 0.12 * H })
  const addFiles = async (files: File[], at?: { x: number; y: number }) => {
    const added: Piece[] = []
    for (const [i, f] of files.entries()) {
      try {
        const id = newId(), img = prepareImage(await decode(f))
        images.current.set(id, img)
        saveImage(id, f)
        const pos = at ? { x: at.x + i * 0.04, y: at.y + i * 0.04 } : centre()
        added.push(imagePiece(id, img.aspect, pos, H))
      } catch {
        setNote(`Couldn’t read ${f.name}`)
      }
    }
    if (!added.length) return
    setVersion(v => v + 1)
    commit(s => ({ ...s, pieces: [...s.pieces, ...added] }))
    setSelected(added[added.length - 1].id)
  }
  const addSamples = async () => {
    setBusy('Fetching photos')
    try {
      const files = await Promise.all(pickSamples().map(s => fetchSample(s.id)))
      await addFiles(files)
    } catch {
      setNote('Couldn’t reach the sample photos')
    }
    setBusy(null)
  }
  const addCut = (cut: Cut) => {
    const p = cutPiece(cut, centre())
    commit(s => ({ ...s, pieces: [...s.pieces, p] }))
    setSelected(p.id)
  }
  const addShape = (kind: Exclude<Piece['kind'], 'image'>, cross?: CrossStyle) => {
    const p = shapePiece(kind, centre(), cross)
    commit(s => ({ ...s, pieces: [...s.pieces, p] }))
    setSelected(p.id)
  }

  // ---------- Arranging ----------
  const reorder = (to: 'front' | 'back') => {
    if (!piece) return
    const id = piece.id
    commit(s => {
      const me = s.pieces.find(p => p.id === id)!, rest = s.pieces.filter(p => p.id !== id)
      return { ...s, pieces: to === 'front' ? [...rest, me] : [me, ...rest] }
    })
  }
  const duplicate = () => {
    if (!piece) return
    const copy = { ...piece, id: newId(), x: piece.x + 0.03, y: piece.y + 0.03 }
    commit(s => ({ ...s, pieces: [...s.pieces, copy] }))
    setSelected(copy.id)
  }
  const remove = () => {
    if (!piece) return
    const { id, imageId } = piece
    commit(s => {
      const next = s.pieces.filter(p => p.id !== id)
      // An image file is only dropped when no other piece uses it
      if (imageId && !next.some(p => p.imageId === imageId)) deleteImage(imageId)
      return { ...s, pieces: next }
    })
    setSelected(null)
  }
  const shuffle = () => {
    if (!scene.pieces.length) return
    commit(s => ({ ...s, pieces: randomise(s) }))
    setNote('Shuffled · ⌘Z to undo')
  }

  // Keys: delete, duplicate, order, nudge, undo; paste images
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, [contenteditable="true"]')) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return }
      if (!piece) return
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); remove() }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate() }
      else if (e.key === ']') reorder('front')
      else if (e.key === '[') reorder('back')
      else if (e.key === 'Escape') setSelected(null)
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const d = e.shiftKey ? 0.02 : 0.004
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        livePatch(piece.id, { x: piece.x + dx, y: piece.y + dy }); endGesture()
      }
    }
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter(f => f.type.startsWith('image/'))
      if (files.length) { e.preventDefault(); addFiles(files) }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('paste', onPaste) }
  })

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 2400)
    return () => clearTimeout(t)
  }, [note])

  // ---------- Export ----------
  const [pngSize, setPngSize] = useState<'2048' | '4096'>('2048')
  const [videoSize, setVideoSize] = useState<'1080' | '1920'>('1080')
  const savePng = async () => {
    setBusy('Rendering')
    const blob = await exportPng(scene, images.current, textures, Number(pngSize))
    setBusy(null)
    if (blob) download(blob, `stacker-${pngSize}.png`)
  }
  const saveVideo = async () => {
    setBusy('Recording 0%')
    const out = await exportVideo(scene, images.current, textures, Number(videoSize), f => setBusy(`Recording ${Math.round(f * 100)}%`))
    setBusy(null)
    if (!out) return setNote('Recording isn’t supported in this browser')
    download(out.blob, `stacker-${videoSize}.${out.ext}`)
  }

  const inset = !panel ? { right: 0, bottom: 0 } : phone ? { right: 0, bottom: window.innerHeight * PHONE_SHEET } : { right: PANEL_W, bottom: 0 }
  const current = panels.find(p => p.id === panel)
  const empty = loaded && scene.pieces.length === 0

  return (
    <TooltipProvider delayDuration={400}>
      <Splash label="Loading stacker">
        <path pathLength={1} d="M10 4h12v24H10z" />
        <path pathLength={1} d="M20 11a4 4 0 1 1-8 0a4 4 0 1 1 8 0" />
        <path pathLength={1} d="M20 21a4 4 0 1 1-8 0a4 4 0 1 1 8 0" />
      </Splash>

      <Stage
        scene={scene}
        images={images.current}
        textures={textures}
        version={version}
        selected={selected}
        onSelect={setSelected}
        onChange={livePatch}
        onCommit={endGesture}
        onDropFiles={addFiles}
        inset={inset}
        phone={phone}
        play={play}
        onPlayEnd={() => {}}
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => {
          addFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />

      {empty && (
        <div className="pointer-events-none fixed inset-0 grid place-items-center" style={{ paddingRight: inset.right, paddingBottom: inset.bottom }}>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl p-8 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ImagePlus className="size-6" strokeWidth={1.5} />
            <span className="text-xs">Drop images, or add a shape</span>
          </button>
        </div>
      )}

      <PanelRail panels={panels} open={panel} onToggle={id => setPanel(panel === id ? null : id)} phone={phone} />

      <PanelSheet open={panel !== null} title={current?.label} onClose={() => setPanel(null)} phone={phone}>
        {panel === 'add' && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                <ImagePlus strokeWidth={1.5} />
                Images
              </Button>
              <Button variant="secondary" disabled={!!busy} onClick={addSamples}>
                <Images strokeWidth={1.5} />
                {busy === 'Fetching photos' ? 'Fetching…' : 'Sample photos'}
              </Button>
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              Samples are free photos from <a className="underline underline-offset-2" href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>.
            </p>
            <FieldGroup title="Shapes">
              <div className="grid grid-cols-3 gap-1.5">
                {CUTS.filter(c => c.value !== 'none').map(c => (
                  <Button key={c.value} variant="secondary" className="h-16 flex-col gap-1.5 text-xs font-normal" onClick={() => addCut(c.value)}>
                    <CutIcon cut={c.value} />
                    {c.label}
                  </Button>
                ))}
                {([['block', 'Block', Square], ['grid', 'Grid', Grid3x3]] as const).map(([k, label, Icon]) => (
                  <Button key={k} variant="secondary" className="h-16 flex-col gap-1.5 text-xs font-normal" onClick={() => addShape(k)}>
                    <Icon className="size-5" strokeWidth={1.5} />
                    {label}
                  </Button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup title="Crosses">
              <div className="grid grid-cols-3 gap-1.5">
                {([['plus', 'Plus', Plus], ['x', 'Cross', X], ['reg', 'Register', Circle]] as const).map(([c, label, Icon]) => (
                  <Button key={c} variant="secondary" className="h-16 flex-col gap-1.5 text-xs font-normal" onClick={() => addShape('cross', c)}>
                    <Icon className="size-5" strokeWidth={1.5} />
                    {label}
                  </Button>
                ))}
              </div>
            </FieldGroup>
          </>
        )}

        {panel === 'piece' && (!piece ? (
          <p className="text-xs text-muted-foreground">Select a piece on the canvas.</p>
        ) : (
          <>
            <FieldGroup>
              <Range label="Show through" value={piece.show} onChange={v => updatePiece({ show: v })} onCommit={endGesture} />
              {(piece.kind === 'image' || piece.kind === 'block' || piece.kind === 'circle') && (
                <Range label="Print feel" value={piece.texture} onChange={v => updatePiece({ texture: v })} onCommit={endGesture} />
              )}
              <Field label="Blend">
                <Segmented label="Blend" value={piece.blend} onChange={v => { updatePiece({ blend: v }); endGesture() }} options={[{ value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }]} />
              </Field>
            </FieldGroup>
            {(piece.kind === 'image' || piece.kind === 'block' || piece.kind === 'circle') && (
              <FieldGroup title="Texture">
                <TexturePicker
                  textures={textureList}
                  value={piece.tex?.source ?? null}
                  onChange={id => { updatePiece({ tex: id ? { blend: 'multiply', amount: 0.5, scale: 1, colour: 'neutral', ...piece.tex, source: id } : null }); endGesture() }}
                  onLoad={async f => { const id = await addTexture(f); if (id) { updatePiece({ tex: { blend: 'multiply', amount: 0.5, scale: 1, colour: 'neutral', ...piece.tex, source: id } }); endGesture() } }}
                  onRemove={removeTexture}
                />
                {piece.tex && (
                  <>
                    <Field label="Blend">
                      <Segmented label="Texture blend" value={piece.tex.blend} onChange={(v: Blend) => { updatePiece({ tex: { ...piece.tex!, blend: v } }); endGesture() }} options={BLENDS} />
                    </Field>
                    <Range label="Amount" value={piece.tex.amount} onChange={v => updatePiece({ tex: { ...piece.tex!, amount: v } })} onCommit={endGesture} />
                  </>
                )}
              </FieldGroup>
            )}
            {piece.kind === 'image' && (
              <FieldGroup title="Adjust">
                {([['sat', 'Saturation'], ['con', 'Contrast'], ['bri', 'Brightness']] as const).map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Slider aria-label={label} min={k === 'sat' ? 0 : 0.5} max={k === 'sat' ? 2 : 1.5} step={0.01} value={[piece.adjust[k]]}
                      onValueChange={([v]) => updatePiece({ adjust: { ...piece.adjust, [k]: v } })} onValueCommit={endGesture} />
                  </Field>
                ))}
              </FieldGroup>
            )}
            {piece.kind === 'block' && (
              <FieldGroup title="Shape">
                <CutPicker value={piece.crop} onChange={v => { updatePiece({ crop: v }); endGesture() }} options={CUTS} />
              </FieldGroup>
            )}
            {piece.kind === 'image' && (
              <FieldGroup title="Image">
                <Field label="Shape">
                  <CutPicker value={piece.crop} onChange={v => { updatePiece({ crop: v }); endGesture() }} options={CUTS} />
                </Field>
                <Field label="Black and white">
                  <OnOff label="Black and white" value={piece.mono} onChange={v => { updatePiece({ mono: v }); endGesture() }} />
                </Field>
              </FieldGroup>
            )}
            {(piece.kind === 'image' || piece.kind === 'block') && (
              <Field label="Edge">
                <Segmented label="Edge" value={piece.edge} onChange={v => { updatePiece({ edge: v }); endGesture() }} options={[{ value: 'clean', label: 'Clean' }, { value: 'torn', label: 'Torn' }]} />
              </Field>
            )}
            {piece.kind !== 'image' && (
              <Field label="Colour">
                <Swatches label="Colour" value={piece.color} onChange={v => { updatePiece({ color: v }); endGesture() }} colours={SWATCHES} />
              </Field>
            )}
            {piece.kind === 'cross' && (
              <Field label="Mark">
                <Segmented label="Mark" value={piece.cross} onChange={v => { updatePiece({ cross: v }); endGesture() }} options={[{ value: 'plus', label: 'Plus' }, { value: 'x', label: 'Cross' }, { value: 'reg', label: 'Register' }]} />
              </Field>
            )}
          </>
        ))}

        {panel === 'canvas' && (
          <FieldGroup>
            <Field label="Format">
              <Segmented label="Format" value={scene.format} onChange={(v: Format) => commit(s => ({ ...s, format: v }))} options={(Object.keys(FORMATS) as Format[]).map(f => ({ value: f, label: f }))} />
            </Field>
            <Field label="Background">
              <Swatches label="Background" value={scene.bg} onChange={v => commit(s => ({ ...s, bg: v }))} colours={BG_SWATCHES} />
            </Field>
            <Field label="Randomise">
              <Segmented label="Randomise" value={scene.tilt ? 'tilted' : 'straight'} onChange={v => setScene(sc => ({ ...sc, tilt: v === 'tilted' }))} options={[{ value: 'straight', label: 'Straight' }, { value: 'tilted', label: 'Tilted' }]} />
            </Field>
            <Field label="Outside the canvas">
              <Segmented label="Outside the canvas" value={scene.outside} onChange={v => setScene(sc => ({ ...sc, outside: v }))} options={[{ value: 'hide', label: 'Hide' }, { value: 'show', label: 'Show' }]} />
            </Field>
          </FieldGroup>
        )}

        {panel === 'texture' && (
          <>
            {scene.texture.layers.map((layer, i) => (
              <FieldGroup key={i} title={`Layer ${i + 1}`}>
                <TexturePicker
                  textures={textureList}
                  value={layer.source}
                  allowNone={false}
                  onChange={id => { if (id) { setLayer(i, { source: id }); endGesture() } }}
                  onLoad={async f => { const id = await addTexture(f); if (id) { setLayer(i, { source: id }); endGesture() } }}
                  onRemove={removeTexture}
                />
                <Field label="Blend">
                  <Segmented label={`Layer ${i + 1} blend`} value={layer.blend} onChange={(v: Blend) => { setLayer(i, { blend: v }); endGesture() }} options={BLENDS} />
                </Field>
                <Range label="Amount" value={layer.amount} onChange={v => setLayer(i, { amount: v })} onCommit={endGesture} />
                <Field label="Scale">
                  <Slider aria-label="Scale" min={0.25} max={4} step={0.05} value={[layer.scale]} onValueChange={([v]) => setLayer(i, { scale: v })} onValueCommit={endGesture} />
                </Field>
                <div className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <Segmented label={`Layer ${i + 1} colour`} value={layer.colour} onChange={v => { setLayer(i, { colour: v }); endGesture() }} options={[{ value: 'neutral', label: 'Neutral' }, { value: 'original', label: 'Original colour' }]} />
                  </div>
                  <ToolButton icon={Trash2} label="Remove layer" side="top" className="size-8" onClick={() => removeLayer(i)} />
                </div>
              </FieldGroup>
            ))}
            {scene.texture.layers.length < 3 && (
              <Button variant="secondary" onClick={() => addLayer('halftone')}>
                <Plus strokeWidth={1.5} />
                Add texture layer
              </Button>
            )}
            <FieldGroup>
              <Range label="Fade" value={scene.texture.fade} onChange={v => setTexture({ fade: v })} onCommit={endGesture} />
            </FieldGroup>
          </>
        )}

        {panel === 'motion' && (
          <>
            <FieldGroup>
              <Field label="Style">
                <Segmented
                  label="Style"
                  value={scene.anim.style}
                  onChange={(v: AnimStyle) => setAnim({ style: v })}
                  options={[{ value: 'pop', label: 'Pop' }, { value: 'bump', label: 'Bump' }, { value: 'window', label: 'Window' }, { value: 'build', label: 'Build' }]}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                {{ pop: 'Each piece cuts in on its beat and stays.', bump: 'Cuts in a touch big for a frame, then sits.', window: 'Only the newest three show; everything cuts in on the last beat.', build: 'Builds up, holds, then cuts away: a seamless loop.' }[scene.anim.style]}
              </p>
            </FieldGroup>
            <FieldGroup title="Timing">
              <Field label="Beat">
                <div className="flex items-center gap-3">
                  <Slider aria-label="Beat" className="w-auto min-w-0 flex-1" min={0.06} max={1} step={0.01} value={[scene.anim.beat]} onValueChange={([v]) => setAnim({ beat: v })} />
                  <span className="shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground tabular-nums">{scene.anim.beat.toFixed(2)}s · {Math.round(60 / scene.anim.beat)} bpm</span>
                </div>
              </Field>
              <Field label="Hold">
                <div className="flex items-center gap-3">
                  <Slider aria-label="Hold" className="w-auto min-w-0 flex-1" min={0.4} max={4} step={0.1} value={[scene.anim.hold]} onValueChange={([v]) => setAnim({ hold: v })} />
                  <span className="shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground tabular-nums">{scene.anim.hold.toFixed(1)}s</span>
                </div>
              </Field>
              <Field label="Order">
                <div className="flex gap-1">
                  <div className="min-w-0 flex-1">
                    <Segmented label="Order" value={scene.anim.order} onChange={v => setAnim({ order: v })} options={[{ value: 'stack', label: 'Stacking' }, { value: 'random', label: 'Random' }]} />
                  </div>
                  {scene.anim.order === 'random' && (
                    <ToolButton icon={Shuffle} label="New random order" side="top" className="size-8" onClick={() => setAnim({ seed: Math.floor(Math.random() * 1e9) })} />
                  )}
                </div>
              </Field>
            </FieldGroup>
            <Button variant="secondary" disabled={!scene.pieces.length} onClick={() => { setSelected(null); setPlay(n => n + 1) }}>
              <Play strokeWidth={1.5} />
              Play
            </Button>
          </>
        )}

        {panel === 'export' && (
          <>
            <FieldGroup title="Image">
              <Field label="Size">
                <Segmented label="Image size" value={pngSize} onChange={setPngSize} options={[{ value: '2048', label: '2048' }, { value: '4096', label: '4096' }]} />
              </Field>
              <Button variant="secondary" disabled={!!busy || !scene.pieces.length} onClick={savePng}>Save PNG</Button>
            </FieldGroup>
            <FieldGroup title="Animation">
              <Field label="Size">
                <Segmented label="Video size" value={videoSize} onChange={setVideoSize} options={[{ value: '1080', label: '1080' }, { value: '1920', label: '1920' }]} />
              </Field>
              <Button variant="secondary" disabled={!!busy || !scene.pieces.length} onClick={saveVideo}>Record video</Button>
              <p className="text-xs text-muted-foreground">Uses the Motion settings. MP4 where your browser can record it, otherwise WebM.</p>
            </FieldGroup>
            {busy && <p role="status" className="text-xs text-muted-foreground">{busy}</p>}
          </>
        )}
      </PanelSheet>

      <ActionDock phone={phone} panelOpen={panel !== null}>
        {note && <p role="status" className="panel rounded-full px-3 py-1 text-xs text-muted-foreground">{note}</p>}
        <Toolbar aria-label="Collage">
          <ToolButton icon={Shuffle} label="Randomise layout" side="top" disabled={!scene.pieces.length} onClick={shuffle} />
          <ToolButton icon={Play} label="Play the arrival" side="top" disabled={!scene.pieces.length} onClick={() => { setSelected(null); setPlay(n => n + 1) }} />
          <ToolButton icon={Undo2} label="Undo" side="top" disabled={!history.current.length} onClick={undo} />
          <ToolbarSeparator />
          {piece ? (
            <>
              <ToolButton icon={BringToFront} label="Bring to front" side="top" onClick={() => reorder('front')} />
              <ToolButton icon={SendToBack} label="Send to back" side="top" onClick={() => reorder('back')} />
              <ToolButton icon={CopyPlus} label="Duplicate" side="top" onClick={duplicate} />
              <ToolButton icon={Trash2} label="Delete" side="top" onClick={remove} />
            </>
          ) : (
            <>
              <ToolButton icon={ImagePlus} label="Add images" side="top" onClick={() => fileInput.current?.click()} />
              <ToolButton icon={Layers2} label="Add a shape" side="top" onClick={() => setPanel('add')} />
            </>
          )}
        </Toolbar>
      </ActionDock>
    </TooltipProvider>
  )
}
