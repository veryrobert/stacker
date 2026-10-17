// Keeps the collage in this browser (IndexedDB): the scene, and each image's original file.
// Storage can be unavailable (private mode, blocked site data); everything still works, it just
// isn't remembered.
import type { Scene } from './scene'

const DB = 'stacker', STORE = 'kv'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE)
    const req = fn(s)
    t.oncomplete = () => resolve(req ? req.result : undefined)
    t.onerror = () => reject(t.error)
  })
}

export const saveScene = (s: Scene) => tx('readwrite', st => { st.put(s, 'scene') }).catch(() => {})
export const loadScene = () => tx<Scene>('readonly', st => st.get('scene')).catch(() => undefined)
export const saveImage = (id: string, blob: Blob) => tx('readwrite', st => { st.put(blob, `img:${id}`) }).catch(() => {})
export const loadImage = (id: string) => tx<Blob>('readonly', st => st.get(`img:${id}`)).catch(() => undefined)
export const deleteImage = (id: string) => tx('readwrite', st => { st.delete(`img:${id}`) }).catch(() => {})
