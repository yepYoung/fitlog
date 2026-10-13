import { getStore } from '@edgeone/pages-blob'
import { createApi } from '../../server/api.js'

let store
const handle = createApi(() => store ??= getStore({ name: 'fitlog-private', consistency: 'strong' }))

export function onRequest(context) {
  return handle(context.request, context.env)
}
