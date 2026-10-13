import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApi } from './api.js'

const key = 'test-only-access-key-with-32-characters'
const record = (id, content = '今天状态不错') => ({ id, type: 'reflection', date: '2026-10-13', time: '10:00', content, createdAt: '2026-10-13T02:00:00Z' })

function fixture() {
  const data = new Map()
  const store = {
    async get(key, options = {}) {
      const value = data.get(key)
      if (value === undefined) return null
      return options.type === 'json' ? JSON.parse(value) : value
    },
    async set(key, value) { data.set(key, value) },
    async setJSON(key, value) { data.set(key, JSON.stringify(value)) },
    async list({ prefix = '' } = {}) { return { blobs: [...data.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) } },
    async delete(key) { data.delete(key) },
  }
  const handle = createApi(() => store)
  async function request(path, { method = 'GET', value, raw, cookie, origin = 'https://fitlog.example', extra = {}, env = { FITLOG_ACCESS_KEY: key } } = {}) {
    const headers = { 'X-Fitlog-Request': '1', Origin: origin, ...extra }
    if (cookie) headers.Cookie = cookie
    if (value !== undefined) headers['Content-Type'] = 'application/json'
    return handle(new Request(`https://fitlog.example/api/${path}`, { method, headers, ...(value !== undefined ? { body: JSON.stringify(value) } : raw ? { body: raw } : {}) }), env)
  }
  async function login() {
    const response = await request('session', { method: 'POST', value: { accessKey: key } })
    assert.equal(response.status, 200)
    const header = response.headers.get('set-cookie')
    assert.match(header, /HttpOnly; SameSite=Strict/)
    assert.match(header, /Secure/)
    return header.split(';')[0]
  }
  return { data, store, request, login }
}

test('missing configuration, wrong key, and unauthenticated reads/writes fail closed', async () => {
  const f = fixture()
  assert.equal((await f.request('data', { env: {} })).status, 503)
  assert.equal((await f.request('session', { method: 'POST', value: { accessKey: 'wrong' } })).status, 401)
  for (const [path, method] of [['data', 'GET'], ['records/a', 'PUT'], ['photos/a', 'GET'], ['photos/a', 'PUT'], ['data', 'DELETE']]) {
    assert.equal((await f.request(path, { method, value: method === 'PUT' ? {} : undefined })).status, 401)
  }
  assert.equal(f.data.size, 0)
})

test('two devices share new records without overwriting each other; settings patch by field', async () => {
  const f = fixture(); const a = await f.login(); const b = await f.login()
  const results = await Promise.all([
    f.request('records/a', { method: 'PUT', cookie: a, value: { record: record('a') } }),
    f.request('records/b', { method: 'PUT', cookie: b, value: { record: record('b') } }),
  ])
  results.forEach((r) => assert.equal(r.status, 200))
  await f.request('settings', { method: 'PATCH', cookie: a, value: { settings: { commonFoods: ['鸡蛋'] } } })
  await f.request('settings', { method: 'PATCH', cookie: b, value: { settings: { commonCardio: ['跑步'] } } })
  const snapshot = await (await f.request('data', { cookie: b })).json()
  assert.deepEqual(snapshot.records.map((r) => r.id).sort(), ['a', 'b'])
  assert.deepEqual(snapshot.settings, { commonFoods: ['鸡蛋'], commonCardio: ['跑步'] })
})

test('old-device import preserves newer records and cannot resurrect deleted records', async () => {
  const f = fixture(); const cookie = await f.login()
  await f.request('records/a', { method: 'PUT', cookie, value: { record: record('a', '新版本') } })
  await f.request('records/a', { method: 'PUT', cookie, value: { record: record('a', '旧版本'), importOnly: true } })
  assert.equal((await (await f.request('data', { cookie })).json()).records[0].content, '新版本')
  await f.request('records/a', { method: 'DELETE', cookie })
  await f.request('records/a', { method: 'PUT', cookie, value: { record: record('a'), importOnly: true } })
  // Even an in-flight write after a deletion cannot remove its independent tombstone.
  await f.store.setJSON('records/a', { id: 'a', record: record('a') })
  const state = await (await f.request('data', { cookie })).json()
  assert.deepEqual(state.records, [])
  assert.deepEqual(state.knownRecordIds, ['a'])
  assert.equal((await f.request('records/a', { method: 'PUT', cookie, value: { record: record('a') } })).status, 409)
})

test('photos require authentication, are stored and loaded as bytes, and survive unrelated saves', async () => {
  const f = fixture(); const cookie = await f.login()
  const photo = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01])
  assert.equal((await f.request('photos/p', { method: 'PUT', cookie, raw: photo })).status, 200)
  await f.request('records/a', { method: 'PUT', cookie, value: { record: record('a') } })
  const response = await f.request('photos/p', { cookie })
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), photo)
  assert.equal((await f.request('photos/html', { method: 'PUT', cookie, raw: '<html>bad</html>' })).status, 400)
  assert.equal((await f.request('photos/p', { method: 'PUT', cookie, raw: new Uint8Array(5 * 1024 * 1024 + 1) })).status, 413)
})

test('live edits take precedence over imported records and settings even when imports arrive later', async () => {
  const f = fixture(); const cookie = await f.login()
  await f.store.setJSON('records/a', { id: 'a', record: record('a', '新记录') })
  await f.store.setJSON('imports/a', { id: 'a', record: record('a', '旧记录') })
  await f.store.setJSON('settings/commonFoods', ['新设置'])
  await f.store.setJSON('settings-imports/commonFoods', ['旧设置'])
  const state = await (await f.request('data', { cookie })).json()
  assert.equal(state.records.length, 1)
  assert.equal(state.records[0].content, '新记录')
  assert.deepEqual(state.settings.commonFoods, ['新设置'])
})

test('cross-origin mutations, forged cookies, and invalid records are rejected', async () => {
  const f = fixture(); const cookie = await f.login()
  assert.equal((await f.request('records/a', { method: 'PUT', cookie, origin: 'https://other.example', value: { record: record('a') } })).status, 403)
  assert.equal((await f.request('data', { cookie: cookie + 'tampered' })).status, 401)
  assert.equal((await f.request('records/a', { method: 'PUT', cookie, value: { record: record('b') } })).status, 400)
  assert.equal((await f.request('settings', { method: 'PATCH', cookie, value: { settings: { commonFoods: [null] } } })).status, 400)
})

test('clear removes records, photos and settings while retaining import tombstones', async () => {
  const f = fixture(); const cookie = await f.login()
  await f.request('records/a', { method: 'PUT', cookie, value: { record: record('a') } })
  await f.store.set('photos/p', new ArrayBuffer(4))
  await f.store.setJSON('settings/commonFoods', ['鸡蛋'])
  assert.equal((await f.request('data', { method: 'DELETE', cookie })).status, 200)
  assert.deepEqual([...f.data.keys()], ['deletions/a'])
  const state = await (await f.request('data', { cookie })).json()
  assert.deepEqual(state.records, [])
  assert.deepEqual(state.settings, {})
  assert.deepEqual(state.knownRecordIds, ['a'])
})

test('storage failures are reported and do not leak provider credentials', async () => {
  const f = fixture(); const cookie = await f.login()
  f.store.setJSON = async () => { throw new Error('secret-provider-token') }
  const response = await f.request('records/a', { method: 'PUT', cookie, value: { record: record('a') } })
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /secret-provider/)
})

test('EdgeOne parsed-body requests work behind HTTPS termination with secure cookies', async () => {
  const f = fixture()
  const handle = createApi(() => f.store, { secureCookies: true })
  const json = { accessKey: key }
  const request = new Request('http://fitlog.example/api/session', {
    method: 'POST', headers: { Origin: 'https://fitlog.example', 'Sec-Fetch-Site': 'same-origin', 'X-Fitlog-Request': '1' },
    body: JSON.stringify(json),
  })
  Object.defineProperty(request, 'body', { value: Promise.resolve(json) })
  const login = await handle(request, { FITLOG_ACCESS_KEY: key })
  assert.equal(login.status, 200)
  assert.match(login.headers.get('set-cookie'), /; Secure/)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const photo = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01])
  const upload = new Request('http://fitlog.example/api/photos/p', {
    method: 'PUT', headers: { Cookie: cookie, 'X-Fitlog-Request': '1' }, body: photo,
  })
  Object.defineProperty(upload, 'body', { value: photo })
  assert.equal((await handle(upload, { FITLOG_ACCESS_KEY: key })).status, 200)
  assert.deepEqual(new Uint8Array(await f.store.get('photos/p')), photo)
  assert.equal((await f.request('session', { method: 'POST', value: json, extra: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403)
  const preflight = new Request('http://fitlog.example/api/session', { method: 'OPTIONS', headers: { Origin: 'https://other.example', 'Access-Control-Request-Headers': 'x-fitlog-request' } })
  assert.equal((await handle(preflight, { FITLOG_ACCESS_KEY: key })).status, 403)
})
