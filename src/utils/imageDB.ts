const DB_NAME: string = 'fitlog-images'
const STORE_NAME: string = 'photos'
const DB_VERSION: number = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  const db: IDBDatabase = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadImage(id: string | null | undefined): Promise<Blob | null> {
  if (!id) return null
  const db: IDBDatabase = await openDB()
  return new Promise<Blob | null>((resolve, reject) => {
    const tx: IDBTransaction = db.transaction(STORE_NAME, 'readonly')
    const req: IDBRequest<Blob | undefined> = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteImage(id: string | null | undefined): Promise<void> {
  if (!id) return
  const db: IDBDatabase = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function blobToURL(blob: Blob | null | undefined): string | null {
  if (!blob) return null
  return URL.createObjectURL(blob)
}
