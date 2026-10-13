import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'fitlog_session'
const SESSION_SECONDS = 30 * 24 * 60 * 60
const MAX_JSON = 2 * 1024 * 1024
const MAX_PHOTO = 5 * 1024 * 1024
const ID = /^[a-zA-Z0-9_-]{1,100}$/
const SETTING_KEYS = ['dailyExerciseGoal', 'commonFoods', 'commonStrength', 'commonCardio']
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } })
const hash = (value) => createHash('sha256').update(value).digest()
const equal = (a, b) => timingSafeEqual(hash(a), hash(b))
const signature = (payload, key) => createHmac('sha256', key).update(payload).digest('base64url')

function authenticated(request, key) {
  const cookie = request.headers.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!cookie) return false
  const [expiry, sig, extra] = cookie.split('.')
  return !extra && /^\d+$/.test(expiry) && Number(expiry) > Date.now() && Number(expiry) <= Date.now() + SESSION_SECONDS * 1000 + 60000 && typeof sig === 'string' && equal(sig, signature(expiry, key))
}

function cookie(request, value, age) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`
}

async function bytes(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw new ApiError(413, '内容过大')
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks = []; let total = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) { await reader.cancel(); throw new ApiError(413, '内容过大') }
    chunks.push(value)
  }
  const result = new Uint8Array(total); let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
  return result
}

async function body(request) {
  try { return JSON.parse(new TextDecoder().decode(await bytes(request, MAX_JSON))) }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, '数据格式有误') }
}

function validateRecord(record, id) {
  if (!record || typeof record !== 'object' || record.id !== id || !ID.test(id) || !['food', 'exercise', 'weight', 'reflection'].includes(record.type)
    || typeof record.date !== 'string' || typeof record.time !== 'string' || typeof record.createdAt !== 'string') throw new ApiError(400, '记录格式有误')
  if (record.type === 'food' && (!Array.isArray(record.items) || record.items.some((item) => !item || typeof item.name !== 'string') || (record.photoId != null && !ID.test(record.photoId)))) throw new ApiError(400, '饮食记录格式有误')
  if (record.type === 'weight' && (typeof record.weight !== 'number' || !Number.isFinite(record.weight) || record.weight <= 0)) throw new ApiError(400, '体重格式有误')
  if (record.type === 'reflection' && typeof record.content !== 'string') throw new ApiError(400, '感想格式有误')
  if (record.type === 'exercise' && (!['strength', 'cardio'].includes(record.exerciseCategory) || typeof record.exerciseType !== 'string')) throw new ApiError(400, '运动记录格式有误')
  return record
}

function validateSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new ApiError(400, '设置格式有误')
  for (const [key, value] of Object.entries(settings)) {
    if (!SETTING_KEYS.includes(key)) throw new ApiError(400, '未知设置')
    if (key === 'dailyExerciseGoal' ? typeof value !== 'number' || !Number.isFinite(value) || value <= 0 : !Array.isArray(value)) throw new ApiError(400, '设置格式有误')
    if ((key === 'commonFoods' || key === 'commonCardio') && value.some((v) => typeof v !== 'string')) throw new ApiError(400, '设置格式有误')
    if (key === 'commonStrength' && value.some((v) => !v || typeof v.group !== 'string' || !Array.isArray(v.items) || v.items.some((s) => typeof s !== 'string'))) throw new ApiError(400, '设置格式有误')
  }
  return settings
}

async function mapLimit(items, mapper) {
  const output = new Array(items.length); let cursor = 0
  await Promise.all(Array.from({ length: Math.min(items.length, 8) }, async () => {
    while (cursor < items.length) { const i = cursor++; output[i] = await mapper(items[i]) }
  }))
  return output
}

async function snapshot(store) {
  const { blobs } = await store.list({ prefix: 'records/', consistency: 'strong' })
  const { blobs: imports } = await store.list({ prefix: 'imports/', consistency: 'strong' })
  const { blobs: tombstones } = await store.list({ prefix: 'deletions/', consistency: 'strong' })
  const deletedIds = new Set(tombstones.map(({ key }) => key.slice('deletions/'.length)))
  const candidates = await mapLimit([...imports, ...blobs], ({ key }) => store.get(key, { type: 'json', consistency: 'strong' }))
  // Live records take precedence over imports even when both writes happen concurrently.
  const rows = [...new Map(candidates.filter(Boolean).map((row) => [row.id, row])).values()]
  const values = await Promise.all(SETTING_KEYS.map(async (key) => {
    const live = await store.get(`settings/${key}`, { type: 'json', consistency: 'strong' })
    return live ?? await store.get(`settings-imports/${key}`, { type: 'json', consistency: 'strong' })
  }))
  return {
    records: rows.filter((row) => row && !row.deleted && !deletedIds.has(row.id)).map((row) => row.record).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    knownRecordIds: [...new Set([...rows.filter(Boolean).map((row) => row.id), ...deletedIds])],
    settings: Object.fromEntries(SETTING_KEYS.flatMap((key, i) => values[i] === null ? [] : [[key, values[i]]])),
  }
}

/** Both the EdgeOne handler and local development use this authenticated API. */
export function createApi(getStore) {
  return async function handle(request, env = {}) {
    try {
      const key = env.FITLOG_ACCESS_KEY
      if (typeof key !== 'string' || key.length < 24) throw new ApiError(503, '云端尚未配置访问口令')
      const url = new URL(request.url)
      const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '')
      const method = request.method
      if (!['GET', 'HEAD'].includes(method)) {
        const origin = request.headers.get('origin')
        if (request.headers.get('X-Fitlog-Request') !== '1' || (origin && origin !== url.origin)) throw new ApiError(403, '请求来源无效')
      }
      if (path === 'session' && method === 'POST') {
        const credentials = await body(request)
        if (typeof credentials?.accessKey !== 'string' || !equal(credentials.accessKey, key)) throw new ApiError(401, '访问口令不正确')
        const expiry = String(Date.now() + SESSION_SECONDS * 1000)
        return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, `${expiry}.${signature(expiry, key)}`, SESSION_SECONDS) })
      }
      if (path === 'session' && method === 'DELETE') return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) })
      if (!authenticated(request, key)) throw new ApiError(401, '请先输入访问口令')
      if (path === 'session' && method === 'GET') return json({ ok: true })
      const store = getStore()
      if (path === 'data' && method === 'GET') return json(await snapshot(store))

      const match = /^(records|photos)\/([a-zA-Z0-9_-]{1,100})$/.exec(path)
      if (match?.[1] === 'records') {
        const id = match[2]; const storageKey = `records/${id}`
        if (method === 'PUT') {
          const data = await body(request)
          const record = validateRecord(data?.record, id)
          const deleted = await store.get(`deletions/${id}`, { type: 'json', consistency: 'strong' })
          if (deleted) {
            if (data.importOnly) return json({ skipped: true })
            throw new ApiError(409, '这条记录已在另一台设备删除，请刷新后查看')
          }
          // Keep tombstones, so importing an old device cannot restore deleted records.
          if (data.importOnly && await store.get(storageKey, { type: 'json', consistency: 'strong' })) return json({ skipped: true })
          if (record.type === 'food' && record.photoId && !await store.get(`photos/${record.photoId}`, { type: 'arrayBuffer', consistency: 'strong' })) throw new ApiError(400, '照片还未上传成功，请重试')
          await store.setJSON(data.importOnly ? `imports/${id}` : storageKey, { id, record, updatedAt: new Date().toISOString() })
          return json({ ok: true })
        }
        if (method === 'DELETE') {
          await store.setJSON(`deletions/${id}`, { id, deleted: true, updatedAt: new Date().toISOString() })
          return json({ ok: true })
        }
      }
      if (match?.[1] === 'photos') {
        const storageKey = `photos/${match[2]}`
        if (method === 'PUT') {
          const data = await bytes(request, MAX_PHOTO)
          // Uploaded photos are raster data only; never serve HTML or SVG under this origin.
          const mime = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff ? 'image/jpeg'
            : data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 ? 'image/png'
            : new TextDecoder().decode(data.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(data.slice(8, 12)) === 'WEBP' ? 'image/webp' : null
          if (!mime) throw new ApiError(400, '仅支持 JPEG、PNG、WebP 照片')
          await store.set(storageKey, data.buffer)
          return json({ ok: true })
        }
        if (method === 'GET') {
          const data = await store.get(storageKey, { type: 'arrayBuffer', consistency: 'strong' })
          if (!data) throw new ApiError(404, '未找到照片')
          const bytes = new Uint8Array(data)
          const mime = bytes[0] === 0xff ? 'image/jpeg' : bytes[0] === 0x89 ? 'image/png' : 'image/webp'
          return new Response(data, { headers: { ...headers, 'Content-Type': mime } })
        }
      }
      if (path === 'settings' && method === 'PATCH') {
        const data = await body(request)
        const patch = validateSettings(data?.settings)
        for (const [name, value] of Object.entries(patch)) {
          if (data.importOnly && await store.get(`settings/${name}`, { type: 'json', consistency: 'strong' }) !== null) continue
          await store.setJSON(`${data.importOnly ? 'settings-imports' : 'settings'}/${name}`, value)
        }
        return json({ ok: true })
      }
      if (path === 'data' && method === 'DELETE') {
        const { blobs } = await store.list({ consistency: 'strong' })
        // Records are tombstoned. Photo deletion is limited to this app's namespace.
        await mapLimit(blobs.filter(({ key }) => key.startsWith('records/') || key.startsWith('imports/')), ({ key }) => store.setJSON(`deletions/${key.slice(8)}`, { id: key.slice(8), deleted: true, updatedAt: new Date().toISOString() }))
        await mapLimit(blobs.filter(({ key }) => key.startsWith('records/') || key.startsWith('imports/') || key.startsWith('photos/') || key.startsWith('settings/') || key.startsWith('settings-imports/')), ({ key }) => store.delete(key))
        return json({ ok: true })
      }
      throw new ApiError(404, '接口不存在')
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status)
      // Do not return provider details or credentials to the browser.
      return json({ error: '云端暂时不可用，请稍后重试' }, 503)
    }
  }
}
