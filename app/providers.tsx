"use client";

import {
  StarknetConfig,
  jsonRpcProvider,
  argent,
  braavos,
} from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";

// Use your Alchemy Starknet Sepolia key
function rpc() {
  return {
    nodeUrl:
      "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/15ETxFmQjLToF2x3fVGBd",
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={jsonRpcProvider({ rpc })}
      connectors={[argent(), braavos()]}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );

  
}