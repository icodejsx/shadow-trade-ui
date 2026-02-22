"use client";

import { StarknetConfig, jsonRpcProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";

function rpc() {
  return {
    nodeUrl: "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo",
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