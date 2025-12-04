import 'dotenv/config';
import type { PluginConfigInput } from 'every-plugin';
import packageJson from './package.json' with { type: 'json' };
import type Plugin from './src/index';

export default {
  pluginId: packageJson.name,
  port: 3016,
  config: {
    variables: {
      ipfsGatewayUrl: 'https://gateway.pinata.cloud/ipfs',
      timeout: 10000,
    },
    secrets: {
      farcasterDeveloperMnemonic: process.env.FARCASTER_DEVELOPER_MNEMONIC || '',
      neynarApiKey: process.env.NEYNAR_API_KEY || '',
      pinataJwt: process.env.PINATA_JWT || '',
    }
  } satisfies PluginConfigInput<typeof Plugin>
}
