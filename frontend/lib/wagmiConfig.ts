import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { studioDevnet } from 'genlayer-js/chains';

export const config = createConfig({
  chains: [studioDevnet],
  connectors: [
    injected(),
  ],
  transports: {
    [studioDevnet.id]: http(),
  },
});
