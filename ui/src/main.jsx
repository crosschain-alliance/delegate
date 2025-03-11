import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Buffer } from "buffer"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createConfig, http, WagmiProvider } from "wagmi"
import { RainbowKitProvider } from "@rainbow-me/rainbowkit"

import App from "./App.jsx"
import "@rainbow-me/rainbowkit/styles.css"

import "./index.css"
import { arbitrum, monadTestnet } from "viem/chains"

window.Buffer = window.Buffer || Buffer

monadTestnet.iconUrl = "./assets/png/monad.png"

export const config = createConfig({
  chains: [monadTestnet, arbitrum],
  transports: {
    [monadTestnet.id]: http(),
    [arbitrum.id]: http(),
  },
})

const queryClient = new QueryClient()

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
