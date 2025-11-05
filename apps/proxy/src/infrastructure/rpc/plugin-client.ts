import { createClient } from '@orpc/client';
import type { AppRouterClient } from '@crosspost/api/routers';

const PLUGIN_SERVER_URL = Deno.env.get('PLUGIN_SERVER_URL') || 'http://localhost:8787/rpc';

export const pluginClient = createClient<AppRouterClient>({
  baseURL: PLUGIN_SERVER_URL,
});
