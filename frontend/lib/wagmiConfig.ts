import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';

export const genLayerStudioNet = {
  id: 61999,
  name: 'GenLayer StudioNet',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://studio.genlayer.com/api'] },
    public: { http: ['https://studio.genlayer.com/api'] },
  },
} as const;

export const config = createConfig({
  chains: [genLayerStudioNet],
  connectors: [
    injected(),
  ],
  transports: {
    [genLayerStudioNet.id]: http(),
  },
});
