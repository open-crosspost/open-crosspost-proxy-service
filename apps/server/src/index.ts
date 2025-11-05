import { Hono } from 'hono'
import { RPCHandler } from '@orpc/server/fetch'
import { onError } from '@orpc/server'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { router } from '@crosspost/api/routers'
import { createContext } from '@crosspost/api/context'

// Create RPC handler
const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error('RPC Error:', error)
    }),
  ]
})

// Create OpenAPI handler
const apiHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error('OpenAPI Error:', error)
    }),
  ]
})

const app = new Hono()

// Health check
app.get('/', (c) => {
  return c.text('OK')
})

// RPC endpoint
app.all('/rpc/*', async (c) => {
  const req = c.req.raw
  const context = await createContext(req)

  const result = await rpcHandler.handle(req, {
    prefix: '/rpc',
    context
  })

  return result.response
    ? c.newResponse(result.response.body, result.response)
    : c.text('Not Found', 404)
})

// API endpoint (w/ OpenAPI Documentation UI)
app.all('/api/*', async (c) => {
  const req = c.req.raw
  const context = await createContext(req)

  const result = await apiHandler.handle(req, {
    prefix: '/api',
    context
  })

  return result.response
    ? c.newResponse(result.response.body, result.response)
    : c.text('Not Found', 404)
})

// 404 handler
app.all('*', (c) => c.text('Not Found', 404))

const port = Number(process.env.PORT) || 8787
console.log(`🚀 Plugin Service running on http://localhost:${port}`)

export default {
  port: port,
  fetch: app.fetch,
}
