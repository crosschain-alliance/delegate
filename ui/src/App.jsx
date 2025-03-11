import React, { useCallback, useEffect, useState } from "react"
import { deployContract, waitForTransactionReceipt } from "viem/actions"
import { useAccount, useWalletClient } from "wagmi"
import { createPublicClient, http, zeroAddress } from "viem"
import { monadTestnet } from "viem/chains"

import settings from "./settings"
import { config } from "./main"
import { fetchEvents } from "./utils/events"
import keyringDeleGateModuleBytecode from "./utils/bytecodes/keyringDeleGateModule.json"
import keyringDeleGateModuleAbi from "./utils/abi/keyringDeleGateModule.json"
import kmsAdapterAbi from "./utils/abi/kmsAdapter.json"
import deleGateAbi from "./utils/abi/deleGate.json"
import kmsAdapterBytecode from "./utils/bytecodes/kmsAdapter.json"

import Header from "./components/complex/Header"
import EditEthosModal from "./components/complex/EditEthosModal"

const sliceAddress = (address) => `${address.slice(0, 6)}...${address.slice(address.length - 4, address.length)}`

export default () => {
  const [showEditEthosModal, setShowEditEthosModal] = useState(false)
  const [ethos, setEthos] = useState()
  const [subscriptionEvents, setSubscriptionEvents] = useState([])
  const [kmsAdapter, setKmsAdapter] = useState()
  const { data: walletClient } = useWalletClient({ config })
  const account = useAccount()

  useEffect(() => {
    if (account.address) fetchUserData()
  }, [account])

  const fetchEthos = useCallback(async () => {
    try {
      const client = createPublicClient({
        transport: http("https://monad-testnet.g.alchemy.com/v2/c_lEuDySbbwy5iWTXupQNZbWbo--pJ45"),
      })
      const ethos = await client.readContract({
        abi: deleGateAbi,
        address: settings.contractAddresses[monadTestnet.id].deleGate,
        functionName: "getUserEthos",
        args: [account.address],
      })

      setEthos({
        values: ethos.values.split(","),
        interests: ethos.interests.split(","),
        principles: ethos.principles.split(","),
      })
    } catch (err) {
      console.err(err)
    }
  }, [])

  const fetchUserData = useCallback(async () => {
    try {
      const client = createPublicClient({
        transport: http("https://monad-testnet.g.alchemy.com/v2/c_lEuDySbbwy5iWTXupQNZbWbo--pJ45"),
      })
      const [kmsAdapter] = await Promise.all([
        client.readContract({
          abi: deleGateAbi,
          address: settings.contractAddresses[monadTestnet.id].deleGate,
          functionName: "getUserKmsAdapter",
          args: [account.address],
        }),
        fetchEthos(),
      ])

      setKmsAdapter(kmsAdapter)

      const subscriptionEvents = await fetchEvents(
        client,
        settings.deployBlockNumbers[monadTestnet.id].deleGate,
        ({ fromBlock, toBlock }) =>
          client.getContractEvents({
            abi: deleGateAbi,
            address: settings.contractAddresses[monadTestnet.id].deleGate,
            args: {
              voter: [account.address],
            },
            eventName: "Subscribed",
            fromBlock,
            strict: true,
            toBlock,
          }),
      )
      setSubscriptionEvents(
        subscriptionEvents.map(({ args }) => {
          const dao = settings.daos.find(({ address }) => address.toLowerCase() === args.dao.toLowerCase())
          return {
            dao,
            eventArgs: args,
          }
        }),
      )
    } catch (err) {
      console.error(err)
    }
  }, [account])

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
          console.log("transaction hash:", txHash)
        }
      } catch (err) {
        console.error(err)
      }
    },
    [walletClient],
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Ethos Section */}
        <section className="max-w-5xl mx-auto mb-8 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">User Ethos</h2>
            <button
              onClick={() => setShowEditEthosModal(true)}
              className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Modify
            </button>
          </div>

          {/* Principles */}
          <div className="flex items-start mb-4">
            <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">Principles</h3>
            <div className="flex flex-wrap gap-2">
              {ethos?.principles?.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-block bg-blue-50 text-blue-600 px-3 py-1 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="flex items-start mb-4">
            <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">Values</h3>
            <div className="flex flex-wrap gap-2">
              {ethos?.values?.map((item, idx) => (
                <span
                  key={"ethos" + idx}
                  className="inline-block bg-green-50 text-green-600 px-3 py-1 text-xs font-medium rounded-full hover:bg-green-100 transition-colors"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div className="flex items-start">
            <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {ethos?.interests?.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-block bg-purple-50 text-purple-600 px-3 py-1 text-xs font-medium rounded-full hover:bg-purple-100 transition-colors"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* DAOs & Subscriptions */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subscribe to DAOs */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscribe to DAOs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left font-medium">Name</th>
                    <th className="py-2 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {settings.daos.map((dao, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-2">
                        <a
                          className="underline text-blue-600 hover:text-blue-800 transition-colors"
                          href={dao.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {dao.name}
                        </a>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => onSubscribe({ targetChainId: dao.chainId, daoAddress: dao.address })}
                          className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          Subscribe
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Subscriptions */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscriptions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left font-medium">DAO</th>
                    <th className="py-2 text-left font-medium">DeleGated Address</th>
                    <th className="py-2 text-left font-medium">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionEvents.map((subscription, index) => {
                    const delegatedAddressUrl =
                      settings.chains[subscription.eventArgs.targetChainId].blockExplorers.default.url +
                      "/address/" +
                      subscription.eventArgs.module
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2">
                          <a
                            className="underline text-blue-600 hover:text-blue-800 transition-colors"
                            href={subscription.dao.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {subscription.dao.name}
                          </a>
                        </td>
                        <td className="py-2">
                          <a
                            className="underline text-blue-600 hover:text-blue-800 transition-colors"
                            href={delegatedAddressUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {sliceAddress(subscription.eventArgs.module)}
                          </a>
                        </td>
                        <td className="py-2">{/* Put your dynamic vote count or text here */}#</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Substance Labs. All rights reserved.
      </footer>

      <EditEthosModal
        isOpen={showEditEthosModal}
        currentEthos={ethos}
        onClose={() => setShowEditEthosModal(false)}
        onUpdated={() => {
          setShowEditEthosModal(false)
          fetchEthos()
        }}
      />
    </div>
  )
}
