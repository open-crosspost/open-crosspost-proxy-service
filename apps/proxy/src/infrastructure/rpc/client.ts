import { createORPCClient } from '@orpc/client';
import type { AppRouterClient } from '@crosspost/api';

const PLUGIN_SERVER_URL = Deno.env.get('PLUGIN_SERVER_URL') || 'http://localhost:8787/rpc';

export const pluginClient: AppRouterClient = createORPCClient(PLUGIN_SERVER_URL);
