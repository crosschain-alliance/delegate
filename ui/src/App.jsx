import { useCallback, useState } from "react"
import { createPublicClient, http, hexToString } from "viem"
import ReactMarkdown from "react-markdown"

import { discardUselessTextFromProposal, parseProposalText } from "./utils/proposal"

import deleGateAbi from "./utils/abi/deleGate.json"
import llmAdapterAbi from "./utils/abi/llmAdapter.json"

const DELETE_DEPLOY_BLOCK_NUMBER = 7111850n
const DELEGATE_ADDRESS = "0xc927336fCe986bb2a2DC2e4a3070F34Dc8495789"
const LLM_ADAPTER_ADDRESS = "0x327182EA0e305169aADD6B3bCc1A3e7AB4748E7f"

const client = createPublicClient({
  transport: http("https://monad-testnet.g.alchemy.com/v2/"),
})

const fetchEvents = async (call) => {
  let foundOne = false
  let toBlock = await client.getBlockNumber()
  let allEvents = []
  while (true) {
    let fromBlock = toBlock - 1000n

    const events = await call({
      fromBlock,
      toBlock,
    })

    if ((events.length === 0 && foundOne) || fromBlock <= DELETE_DEPLOY_BLOCK_NUMBER) break

    if (events.length > 0) {
      foundOne = true
      allEvents.push(...events)
    }

    toBlock = fromBlock - 1n
  }

  return allEvents
}

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null

  const handleOverlayClick = () => {
    onClose()
  }

  const handleModalContentClick = (e) => {
    e.stopPropagation()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleOverlayClick}>
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
      <div
        className="relative max-h-[80vh] w-11/12 max-w-lg overflow-y-auto rounded bg-white p-6 shadow-md md:w-1/2"
        onClick={handleModalContentClick}
      >
        {children}
      </div>
    </div>
  )
}

const App = () => {
  const [userAddress, setUserAddress] = useState("")
  const [ethos, setEthos] = useState(null)
  const [ksmAdapter, setKmsAdapter] = useState("")
  const [modalsOpens, setModalsOpen] = useState({})
  const [askEvents, setAskEvents] = useState([])
  const [answerEvents, setAnswerEvents] = useState([])

  const onSearch = useCallback(async () => {
    try {
      const [ethos, ksmAdapter] = await Promise.all([
        client.readContract({
          abi: deleGateAbi,
          address: DELEGATE_ADDRESS,
          functionName: "getUserEthos",
          args: [userAddress],
        }),
        client.readContract({
          abi: deleGateAbi,
          address: DELEGATE_ADDRESS,
          functionName: "getUserKmsAdapter",
          args: [userAddress],
        }),
      ])

      setEthos({
        values: ethos.values.split(","),
        interests: ethos.interests.split(","),
        principles: ethos.principles.split(","),
      })
      setKmsAdapter(ksmAdapter)

      const startVoteCastsEvents = await fetchEvents(({ fromBlock, toBlock }) =>
        client.getContractEvents({
          abi: deleGateAbi,
          address: DELEGATE_ADDRESS,
          args: {
            voter: [userAddress],
          },
          eventName: "StartVoteCast",
          fromBlock,
          strict: true,
          toBlock,
        }),
      )

      const promptIds = startVoteCastsEvents.map(({ data }) => data)

      const [askEvents, answerEvents] = await Promise.all([
        Promise.all(
          promptIds.map((promptId) =>
            fetchEvents(({ fromBlock, toBlock }) =>
              client.getContractEvents({
                abi: llmAdapterAbi,
                address: LLM_ADAPTER_ADDRESS,
                args: {
                  promptId: [promptId],
                },
                eventName: "Asked",
                fromBlock,
                strict: true,
                toBlock,
              }),
            ),
          ),
        ),
        Promise.all(
          promptIds.map((promptId) =>
            fetchEvents(({ fromBlock, toBlock }) =>
              client.getContractEvents({
                abi: llmAdapterAbi,
                address: LLM_ADAPTER_ADDRESS,
                args: {
                  promptId: [promptId],
                },
                eventName: "Answered",
                fromBlock,
                strict: true,
                toBlock,
              }),
            ),
          ),
        ),
      ])
      setAskEvents(...askEvents)
      setAnswerEvents(...answerEvents)
    } catch (err) {
      console.error(err)
    }
  }, [userAddress])

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      <header className="w-full border-b border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="https://via.placeholder.com/32x32" alt="DeleGate Logo" className="h-8 w-8 rounded-md" />
            <span className="text-xl font-bold tracking-wide">DeleGate</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center mb-80">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2 align-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-widest">DeleGate</h1>
            <p className="text-sm md:text-base text-gray-500 tracking-wide">bla bla bla bla</p>
          </div>

          <div className="flex justify-center items-center gap-2">
            <input
              type="text"
              placeholder="Search user data..."
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>

          {ethos && (
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="mb-4 flex">
                <h3 className="font-medium text-gray-700 mb-1 text-sm mr-4">Principles</h3>
                <div className="flex flex-wrap gap-2">
                  {ethos.principles.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-blue-50 text-blue-600 px-3 py-1 text-xs font-semibold rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex">
                <h3 className="font-medium text-gray-700 mb-1 text-sm mr-4">Values</h3>
                <div className="flex flex-wrap gap-2">
                  {ethos.values.map((item, idx) => (
                    <span
                      key={"ethos" + idx}
                      className="inline-block bg-green-50 text-green-600 px-3 py-1 text-xs font-semibold rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex">
                <h3 className="font-medium text-gray-700 mb-1 text-sm mr-4">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {ethos.interests.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-purple-50 text-purple-600 px-3 py-1 text-xs font-semibold rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {askEvents.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h2 className="text-xl font-semibold mb-4 ">Past votes</h2>
              <table className="w-full text-left">
                <thead className="border-b border-gray-300 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Vote</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {askEvents.map((event, index) => {
                    return (
                      <tr key={"event" + index} className="border-b border-gray-200 last:border-none ">
                        <td className="py-2 text-sm">#{index + 1}</td>
                        <td className="py-2 text-sm font-bold">{parseProposalText(hexToString(event.data)).title}</td>
                        <td className="py-2 text-sm">{answerEvents[index] || "NOT VOTED"}</td>
                        <td
                          className="py-2 text-sm text-blue-500 underline cursor-pointer"
                          onClick={() => {
                            setModalsOpen((current) => ({
                              ...current,
                              [index]: true,
                            }))
                          }}
                        >
                          Details
                        </td>
                        <Modal
                          isOpen={modalsOpens[index]}
                          onClose={() => {
                            setModalsOpen((current) => ({
                              ...current,
                              [index]: false,
                            }))
                          }}
                        >
                          <ReactMarkdown>{discardUselessTextFromProposal(hexToString(event.data))}</ReactMarkdown>
                        </Modal>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
