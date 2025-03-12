import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { deployContract, waitForTransactionReceipt } from "viem/actions"
import { useAccount, useWalletClient, usePublicClient } from "wagmi"
import { createPublicClient, http, zeroAddress } from "viem"
import { arbitrum, monadTestnet } from "viem/chains"
import { useLocation, useParams } from "react-router"

import settings from "../../../settings"
import { config } from "../../../main"
import { fetchEvents } from "../../../utils/events"
import keyringDeleGateModuleBytecode from "../../../utils/bytecodes/keyringDeleGateModule.json"
import keyringDeleGateModuleAbi from "../../../utils/abi/keyringDeleGateModule.json"
import kmsAdapterAbi from "../../../utils/abi/kmsAdapter.json"
import deleGateAbi from "../../../utils/abi/deleGate.json"
import governorAbi from "../../../utils/abi/governor.json"
import kmsAdapterBytecode from "../../../utils/bytecodes/kmsAdapter.json"

import Header from "../../complex/Header"
import EditEthosModal from "../../complex/EditEthosModal"
import VotesModal from "../../complex/VotesModal"
import Selector from "../../base/Selector"
import Spinner from "../../base/Spinner"
import Footer from "../../base/Footer"
import { sliceAddress } from "../../../utils/address"

const client = createPublicClient({
  transport: http("https://monad-testnet.g.alchemy.com/v2/75LszqDvCMiLQrNFyqricZtsZH0pFSc1"),
})

const Dashboard = () => {
  const location = useLocation()

  const loaded = useRef(false)
  const [showEditEthosModal, setShowEditEthosModal] = useState(false)
  const [showVotesModal, setShowVotesModal] = useState(false)
  const [ethos, setEthos] = useState()
  const [subscriptions, setSubscriptions] = useState([])
  const [votes, setVotes] = useState([])
  const [kmsAdapter, setKmsAdapter] = useState("Keyring")
  const [llmAdapter, setLlmAdapter] = useState("OpenAI")
  const [openAIllmModel, setOpenAILlmModel] = useState("gpt-4.5-preview")
  const [acurastllmModel, setAcurastLlmModel] = useState("llama-8B")
  const [isLoadingVotingActivity, setIsLoadingVotingActivity] = useState(false)
  const { data: walletClient } = useWalletClient({ config })
  const connectedAccount = useAccount()

  const isReadOnly = useMemo(() => location.pathname.split("/").includes("address"), [location])

  const account = useMemo(() => {
    const pathnameParts = location.pathname.split("/")
    if (pathnameParts.includes("address")) {
      return {
        address: pathnameParts[2],
      }
    }
    return connectedAccount
  }, [location, connectedAccount])

  useEffect(() => {
    if (account.address && !loaded.current) {
      fetchUserData()
      loaded.current = true
    }
  }, [account])

  useEffect(() => {
    if (subscriptions.length) {
      fetchSubscriptionsVotes()
    }
  }, [subscriptions])

  const fetchEthos = useCallback(async () => {
    try {
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
      console.error(err)
    }
  }, [account])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const subscriptions = await client.readContract({
        abi: deleGateAbi,
        address: settings.contractAddresses[monadTestnet.id].deleGate,
        functionName: "getUserSubscriptions",
        args: [account.address],
      })

      setSubscriptions(
        subscriptions.map((subscription) => {
          const dao = settings.daos.find(({ address }) => address.toLowerCase() === subscription.dao.toLowerCase())
          return {
            daoData: dao,
            ...subscription,
          }
        }),
      )
    } catch (err) {
      console.error(err)
    }
  }, [account])

  const fetchUserData = useCallback(async () => {
    try {
      const [kmsAdapter] = await Promise.all([
        client.readContract({
          abi: deleGateAbi,
          address: settings.contractAddresses[monadTestnet.id].deleGate,
          functionName: "getUserKmsAdapter",
          args: [account.address],
        }),
        fetchSubscriptions(),
        fetchEthos(),
      ])

      // setKmsAdapter('Keyring') // todo use the contract data
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
          await waitForTransactionReceipt(walletClient, {
            hash: txHash,
          })
          fetchSubscriptions()
          console.log("transaction hash:", txHash)
        }
      } catch (err) {
        console.error(err)
      }
    },
    [walletClient],
  )

  const fetchSubscriptionsVotes = useCallback(async () => {
    try {
      setIsLoadingVotingActivity(true)

      /*const numberOfVotes = subscriptions.map(async (subscription) => {
        const voteEvents = await fetchEvents(
          arbitrumClient,
          settings.deployBlockNumbers[monadTestnet.id].deleGate,
          1,
          ({ fromBlock, toBlock }) =>
            arbitrumClient.getContractEvents({
              abi: governorAbi,
              address: subscription.dao.address,
              args: {
                voter: [account.address],
              },
              eventName: "VoteCast",
              fromBlock,
              strict: true,
              toBlock,
            }),
        )
        let rtn = votes
        rtn[subscription.dao.address] = voteEvents
        setVotes(rtn)
        return voteEvents.length
      })
      setNumberOfVotes(numberOfVotes)*/
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingVotingActivity(false)
    }
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header withConnectButton={!isReadOnly} />

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Ethos Section */}
        <section className="max-w-5xl mx-auto mb-8 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          {ethos &&
          ethos.values?.some((v) => v.trim() !== "") &&
          ethos.interests?.some((i) => i.trim() !== "") &&
          ethos.principles?.some((p) => p.trim() !== "") ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">User Ethos</h2>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowEditEthosModal(true)}
                    className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    Update
                  </button>
                )}
              </div>

              {/* Principles */}
              <div className="flex items-start mb-4">
                <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">Principles</h3>

                <h4 className="flex flex-wrap gap-2">
                  <span className="inline-block bg-blue-50 text-blue-600 px-3 py-1 text-xs font-medium rounded-full italic">
                    {ethos.principles}
                  </span>
                </h4>
              </div>

              {/* Values */}
              <div className="flex items-start mb-4">
                <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">Values</h3>
                <div className="flex flex-wrap gap-2">
                  {ethos.values?.map((item, idx) => (
                    <span
                      key={"ethos" + idx}
                      className="inline-block bg-green-50 text-green-600 px-3 py-1 text-xs font-medium rounded-full italic"
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
                  {ethos.interests?.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-purple-50 text-purple-600 px-3 py-1 text-xs font-medium rounded-full italic"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <div className="flex-column items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">User Ethos</h2>
                <div className="text-sm text-gray-600">You haven't set your ethos yet.</div>
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => setShowEditEthosModal(true)}
                  className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Set
                </button>
              )}
            </div>
          )}
        </section>

        {/* Config */}
        <section className="max-w-5xl mx-auto mb-8 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-column items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Config</h2>
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => null}
                  className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Update
                </button>
              )}
            </div>

            <div className="flex items-start mb-4">
              <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">KMS</h3>

              <h4 className="flex flex-wrap gap-2">
                <Selector onClick={setKmsAdapter} name="Keyring" config={kmsAdapter} />
              </h4>
            </div>

            <div className="flex items-start mb-4">
              <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">LLM</h3>

              <h4 className="flex flex-wrap gap-2">
                <Selector onClick={setLlmAdapter} name="OpenAI" config={llmAdapter} />
                <Selector onClick={setLlmAdapter} name="Acurast" config={llmAdapter} />
              </h4>
            </div>

            <div className="flex items-start mb-4">
              <h3 className="font-medium text-sm text-gray-600 w-24 flex-shrink-0">Model</h3>

              <h4 className="flex flex-wrap gap-2">
                {llmAdapter === "OpenAI" && (
                  <>
                    <Selector onClick={setOpenAILlmModel} name="gpt-4o-mini" config={openAIllmModel} />
                    <Selector onClick={setOpenAILlmModel} name="gpt-4o" config={openAIllmModel} />
                    <Selector onClick={setOpenAILlmModel} name="gpt-4.5-preview" config={openAIllmModel} />
                  </>
                )}
                {llmAdapter === "Acurast" && (
                  <>
                    <Selector onClick={setAcurastLlmModel} name="llama-3B" config={acurastllmModel} />
                    <Selector onClick={setAcurastLlmModel} name="llama-8B" config={acurastllmModel} />
                    <Selector onClick={setAcurastLlmModel} name="qwen2-14B" config={acurastllmModel} />
                  </>
                )}
              </h4>
            </div>
          </>
        </section>

        {/* DAOs & Subscriptions */}
        <div className="max-w-5xl mb-8 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subscribe to DAOs */}
          {!isReadOnly && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscribe to DAOs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-600">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 text-left font-medium">Name</th>
                      <th className="py-2 text-left font-medium">Type</th>
                      <th className="py-2 text-right font-medium">Action</th>
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
                          <div className="text-gray-600 hover:text-blue-800 transition-colors">Tally</div>
                        </td>
                        <td className="py-2 text-right">
                          {subscriptions.some((sub) => sub.dao.toLowerCase() === dao.address.toLowerCase()) ? (
                            <span className="px-3 py-1 text-gray-500 font-medium">Subscribed</span>
                          ) : (
                            <button
                              onClick={() => onSubscribe({ targetChainId: dao.chainId, daoAddress: dao.address })}
                              className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
                            >
                              Subscribe
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active Subscriptions */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscriptions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left font-medium">DAO</th>
                    <th className="py-2 text-left font-medium">DeleGated Address</th>
                    <th className="py-2 text-left font-medium">Voting weight</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription, index) => {
                    const delegatedAddressUrl =
                      settings.chains[subscription.targetChainId].blockExplorers.default.url +
                      "/address/" +
                      subscription.module
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2">
                          <a
                            className="underline text-blue-600 hover:text-blue-800 transition-colors"
                            href={subscription.daoData.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {subscription.daoData.name}
                          </a>
                        </td>
                        <td className="py-2">
                          <a
                            className="underline text-blue-600 hover:text-blue-800 transition-colors"
                            href={delegatedAddressUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {sliceAddress(subscription.module)}
                          </a>
                        </td>
                        <td className="py-2 text-left">#</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Voting Activity */}
        <section className="max-w-5xl mx-auto mb-8 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="items-center flex">
                <h2 className="text-xl font-semibold text-gray-800">Voting Activity</h2>
                {isLoadingVotingActivity && (
                  <div className="ml-2">
                    <Spinner />
                  </div>
                )}
              </div>
            </div>

            <table className="w-full text-sm text-gray-600">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left font-medium">DAO</th>
                  <th className="py-2 text-left font-medium">Vote title</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(votes)
                  .flat()
                  .map((event) => (
                    <tr
                      key={event.args.proposalId}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2">
                        <a
                          className="underline text-blue-600 hover:text-blue-800 transition-colors"
                          href={
                            settings.daos.find((dao) => dao.address.toLowerCase() === event.address.toLowerCase()).link
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {settings.daos.find((dao) => dao.address.toLowerCase() === event.address.toLowerCase()).name}
                        </a>
                      </td>
                      <td className="py-2">
                        <div className="text-gray-600 hover:text-blue-800 transition-colors">
                          {event.args.proposalId}
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <a
                          className="underline text-blue-600 hover:text-blue-800 transition-colors"
                          href={`https://arbiscan.io/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Executed
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        </section>
      </main>

      <Footer />

      <EditEthosModal
        isOpen={showEditEthosModal}
        currentEthos={ethos}
        onClose={() => setShowEditEthosModal(false)}
        onUpdated={() => {
          setShowEditEthosModal(false)
          fetchEthos()
        }}
      />

      <VotesModal isOpen={showVotesModal} votes={votes} onClose={() => setShowVotesModal(false)} />
    </div>
  )
}

export default Dashboard
