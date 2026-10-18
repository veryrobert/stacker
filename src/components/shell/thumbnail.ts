// The index thumbnail: 1600 × 1000 (16:10, the index card's shape), with the work centred on the
// page's black as it sits in the app, so nothing is cropped. Every app offers it in Export.
export const THUMB_W = 1600
export const THUMB_H = 1000

export async function thumbnail(source: Blob | CanvasImageSource, background = '#000', margin = 0.08): Promise<Blob> {
  const img = source instanceof Blob ? await createImageBitmap(source) : source
  const w = 'naturalWidth' in img ? img.naturalWidth : (img as { width: number }).width
  const h = 'naturalHeight' in img ? img.naturalHeight : (img as { height: number }).height
  const c = document.createElement('canvas')
  c.width = THUMB_W
  c.height = THUMB_H
  const g = c.getContext('2d')!
  g.fillStyle = background
  g.fillRect(0, 0, THUMB_W, THUMB_H)
  const room = 1 - margin * 2
  const k = Math.min((THUMB_W * room) / w, (THUMB_H * room) / h)
  const dw = w * k, dh = h * k
  g.imageSmoothingQuality = 'high'
  g.drawImage(img, (THUMB_W - dw) / 2, (THUMB_H - dh) / 2, dw, dh)
  return new Promise((ok, fail) => c.toBlob(b => (b ? ok(b) : fail(new Error('Couldn’t make the thumbnail'))), 'image/png'))
}
