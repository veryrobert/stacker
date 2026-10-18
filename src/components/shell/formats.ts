// Artboard shapes, the same in every app and in this order. Call the control "Format".
// Apps that start from a photo or video can put an "Original" option first.
export const FORMATS = [
  { name: '1:1', tall: 1 },
  { name: '4:5', tall: 5 / 4 },
  { name: '9:16', tall: 16 / 9 },
  { name: '16:9', tall: 9 / 16 },
  { name: 'A4', tall: Math.SQRT2 },
] as const // tall: height over width

export const START_FORMAT = '4:5' // every app opens on this

export type FormatName = (typeof FORMATS)[number]['name']
export const formatTall = (name: FormatName) => FORMATS.find(f => f.name === name)!.tall
