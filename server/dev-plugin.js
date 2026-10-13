import { mkdir, readFile, writeFile, rename, readdir, unlink } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createApi } from './api.js'

/** Local-only storage for development. Production always uses EdgeOne Blob. */
export function fileStore(directory) {
  const root = resolve(directory)
  const pathFor = (key) => {
    if (!/^(records|imports|photos|settings|settings-imports|deletions)\/[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid storage key')
    return join(root, key)
  }
  return {
    async set(key, value) {
      const path = pathFor(key)
      await mkdir(dirname(path), { recursive: true })
      const temporary = `${path}.${randomUUID()}.tmp`
      await writeFile(temporary, typeof value === 'string' ? value : Buffer.from(value))
      await rename(temporary, path)
    },
    async setJSON(key, value) { await this.set(key, JSON.stringify(value)) },
    async get(key, options = {}) {
      let data
      try { data = await readFile(pathFor(key)) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
      if (options.type === 'json') return JSON.parse(data.toString())
      if (options.type === 'arrayBuffer') return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      return data.toString()
    },
    async delete(key) { try { await unlink(pathFor(key)) } catch (error) { if (error.code !== 'ENOENT') throw error } },
    async list(options = {}) {
      let files
      try { files = await readdir(root, { recursive: true, withFileTypes: true }) } catch (error) { if (error.code === 'ENOENT') return { blobs: [] }; throw error }
      const blobs = files.filter((file) => file.isFile() && !file.name.endsWith('.tmp')).map((file) => ({ key: `${file.parentPath.slice(root.length + 1).replaceAll('\\', '/')}/${file.name}` }))
      return { blobs: blobs.filter(({ key }) => key.startsWith(options.prefix ?? '')) }
    },
  }
}

export function devApiPlugin(env) {
  return {
    name: 'fitlog-local-api', apply: 'serve',
    configureServer(server) {
      const handle = createApi(() => fileStore(resolve('.local-data')))
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          const hasBody = !['GET', 'HEAD'].includes(req.method)
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method, headers: req.headers,
            ...(hasBody ? { body: req, duplex: 'half' } : {}),
          })
          const response = await handle(request, env)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch { res.statusCode = 500; res.end('Local API error') }
      })
    },
  }
}
