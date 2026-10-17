// Sample photos from Unsplash (free to use under the Unsplash License), served by Lorem Picsum,
// which allows loading them straight into the canvas. Picked to suit collage: nature, texture, colour.
export const SAMPLES = [
  { id: 1053, author: 'Anna Popović', note: 'sea foam', unsplash: 'https://unsplash.com/photos/x7HJdJZqplo' },
  { id: 1056, author: 'Susanne Feldt', note: 'clouds', unsplash: 'https://unsplash.com/photos/SIoHky3TPeo' },
  { id: 1018, author: 'Andrew Ridley', note: 'green hillside', unsplash: 'https://unsplash.com/photos/Kt5hRENuotI' },
  { id: 1069, author: 'Marat Gilyadzinov', note: 'jellyfish', unsplash: 'https://unsplash.com/photos/wpTWYBll4_w' },
  { id: 106, author: 'Arvee Marie', note: 'flowers', unsplash: 'https://unsplash.com/photos/YnfGtpt2gf4' },
  { id: 1016, author: 'Philippe Wuyts', note: 'red rock', unsplash: 'https://unsplash.com/photos/_h7aBovKia4' },
  { id: 13, author: 'Paul Jarvis', note: 'pebble shore', unsplash: 'https://unsplash.com/photos/3MtiSMdnoCo' },
  { id: 1050, author: 'Joseph Barrientos', note: 'sea cliffs', unsplash: 'https://unsplash.com/photos/xcC5ozHk_N8' },
] as const

export async function fetchSample(id: number): Promise<File> {
  const res = await fetch(`https://picsum.photos/id/${id}/1500/1000`)
  if (!res.ok) throw new Error('Sample photo unavailable')
  return new File([await res.blob()], `sample-${id}.jpg`, { type: 'image/jpeg' })
}

// Four at random, so each press brings a different mix
export function pickSamples(n = 4) {
  return [...SAMPLES].sort(() => Math.random() - 0.5).slice(0, n)
}
