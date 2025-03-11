import React, { useCallback, useState } from "react"
import { deployContract, waitForTransactionReceipt } from "viem/actions"
import { useWalletClient } from "wagmi"
import { zeroAddress } from "viem"
import { arbitrum, monadTestnet } from "viem/chains"

import settings from "./settings"
import { config } from "./main"
import keyringDeleGateModuleBytecode from "./utils/bytecodes/keyringDeleGateModule.json"
import keyringDeleGateModuleAbi from "./utils/abi/keyringDeleGateModule.json"
import kmsAdapterAbi from "./utils/abi/kmsAdapter.json"
import deleGateAbi from "./utils/abi/deleGate.json"
import kmsAdapterBytecode from "./utils/bytecodes/kmsAdapter.json"

import Modal from "./components/base/Modal"
import Header from "./components/complex/Header"

export default () => {
  const [selectedDao, setSelectedDao] = useState(null)

  const { data: walletClient } = useWalletClient({ config })

  const onSubscribe = useCallback(
    async (params) => {
      const { step = 0, kmsAdapter, keyringDeleGateModule, targetChainId, daoAddress } = params
      try {
        if (step === 0) {
          // Nomad
          const txHash = await deployContract(walletClient, {
            abi: kmsAdapterAbi,
            bytecode: kmsAdapterBytecode,
            args: [
              settings.contractAddresses[monadTestnet.id].keyringGateway,
              settings.contractAddresses[monadTestnet.id].deleGate,
            ],
            chain: monadTestnet,
          })
          const receipt = await waitForTransactionReceipt(walletClient, {
            hash: txHash,
          })
          console.log("KmsAdapter:", receipt.contractAddress)

          await walletClient.switchChain({ id: targetChainId })
          return await onSubscribe({
            step: 1,
            kmsAdapter: receipt.contractAddress,
            targetChainId,
            daoAddress,
          })
        }

        if (step === 1) {
          const result = await deployContract(walletClient, {
            abi: keyringDeleGateModuleAbi,
            bytecode: keyringDeleGateModuleBytecode,
            args: [
              walletClient.account.address,
              settings.contractAddresses[targetChainId].keyringGateway, // KeyringGateway on arbitrum
              zeroAddress, // expected signer. Keep it disabled for simplifying testing
              kmsAdapter,
              monadTestnet.id, // expected source chain id
            ],
            chain: settings.chains[targetChainId],
          })

          const receipt = await waitForTransactionReceipt(walletClient, {
            hash: result,
          })
          console.log("KeyringDeleGateModule:", receipt.contractAddress)

          await walletClient.switchChain({ id: monadTestnet.id })
          return await onSubscribe({
            step: 2,
            keyringDeleGateModule: receipt.contractAddress,
            targetChainId,
            daoAddress,
          })
        }

        if (step === 2) {
          const txHash = await walletClient.writeContract({
            abi: deleGateAbi,
            address: settings.contractAddresses[monadTestnet.id].deleGate,
            functionName: "subscribe",
            args: [targetChainId, daoAddress, keyringDeleGateModule],
            chain: monadTestnet,
          })
          console.log("txHash", txHash)
        }
      } catch (err) {
        console.error(err)
      }
    },
    [walletClient],
  )

  return (
    <div className="min-h-screen   flex flex-col">
      <Header />

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center px-4">
        <div className="w-full max-w-5xl overflow-x-auto ">
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Subscribe</th>
              </tr>
            </thead>
            <tbody>
              {settings.daos.map((dao, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="p-2">
                    {" "}
                    <a className="underline text-blue-500" href={dao.link} target="blank">
                      {dao.name}
                    </a>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() =>
                        onSubscribe({
                          targetChainId: dao.chainId,
                          daoAddress: dao.address,
                        })
                      }
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                    >
                      Subscribe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {selectedDao && <Modal isOpen onClose={() => setSelectedDao(null)}></Modal>}
    </div>
  )
}
