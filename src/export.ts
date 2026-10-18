import { arrivalLength, drawScene, type Img } from './render'
import { FORMATS, type Scene } from './scene'

// Pixel size for an export, by its long side
export function exportSize(s: Scene, long: number) {
  const r = FORMATS[s.format]
  const w = r >= 1 ? long : Math.round(long * r), h = r >= 1 ? Math.round(long / r) : long
  return { w: w - (w % 2), h: h - (h % 2) } // even, for video encoders
}

export async function exportPng(s: Scene, images: Map<string, Img>, long: number): Promise<Blob | null> {
  const { w, h } = exportSize(s, long)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  drawScene(c.getContext('2d')!, s, images, w)
  return new Promise(r => c.toBlob(r, 'image/png'))
}

// The arrival animation, recorded in real time from an off-screen canvas.
// MP4 where the browser can record it, otherwise WebM.
export async function exportVideo(
  s: Scene,
  images: Map<string, Img>,
  long: number,
  onProgress: (fraction: number) => void,
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' } | null> {
  const c = document.createElement('canvas')
  if (!c.captureStream || !window.MediaRecorder) return null
  const { w, h } = exportSize(s, long)
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
  const type = types.find(t => MediaRecorder.isTypeSupported(t)) || ''
  const length = arrivalLength(s)
  drawScene(g, s, images, w, { arrival: { time: 0 } })
  const stream = c.captureStream(30), chunks: Blob[] = []
  const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 16e6 } : undefined)
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise<void>(r => { rec.onstop = () => r() })
  rec.start(250)
  const t0 = performance.now()
  await new Promise<void>(resolve => {
    const frame = () => {
      const t = (performance.now() - t0) / 1000
      drawScene(g, s, images, w, { arrival: { time: t } })
      onProgress(Math.min(1, t / length))
      if (t >= length) resolve()
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
  rec.stop()
  await done
  stream.getTracks().forEach(t => t.stop())
  const mime = rec.mimeType || type || 'video/webm'
  const blob = new Blob(chunks, { type: mime })
  return blob.size ? { blob, ext: mime.includes('mp4') ? 'mp4' : 'webm' } : null
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
}
