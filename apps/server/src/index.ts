import { Hono } from 'hono'
import { RPCHandler } from '@orpc/server/fetch'
import { onError } from '@orpc/server'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { initializePlugins } from '@crosspost/api'
import { createAppRouter } from '@crosspost/api/routers'
import { createContext } from '@crosspost/api/context'

// Initialize plugins
const plugins = await initializePlugins({
  TWITTER_PLUGIN_URL: process.env.TWITTER_PLUGIN_URL,
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID!,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET!,
});

// Create router with initialized plugins
const appRouter = createAppRouter(plugins);

// Create RPC handler
const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error('RPC Error:', error)
    }),
  ]
})

// Create OpenAPI handler
const apiHandler = new OpenAPIHandler(appRouter, {
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

// Handle all routes
app.all('*', async (c) => {
  const req = c.req.raw
  const context = await createContext(req)

  // Try RPC first
  const rpcResult = await rpcHandler.handle(req, {
    prefix: '/api',
    context
  })
  if (rpcResult.response) return c.newResponse(rpcResult.response.body, rpcResult.response)

  // Try OpenAPI docs
  const apiResult = await apiHandler.handle(req, {
    prefix: '/docs',
    context
  })
  if (apiResult.response) return c.newResponse(apiResult.response.body, apiResult.response)

  return c.text('Not Found', 404)
})

const port = Number(process.env.PORT) || 8787
console.log(`🚀 Plugin Service running on http://localhost:${port}`)

export default {
  port: port,
  fetch: app.fetch,
}
