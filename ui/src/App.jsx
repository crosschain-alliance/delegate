import { useCallback, useMemo, useState } from "react";
import { createPublicClient, http } from "viem";

import deleGateAbi from './utils/abi/deleGate.json'
import llmAdapterAbi from './utils/abi/llmAdapter.json'

const DELEGATE_ADDRESS = "0xE9739e92f3164326aD54CE691D5E11B004C1B4f6"
const LLM_ADAPTER_ADDRESS = "0xE9739e92f3164326aD54CE691D5E11B004C1B4f6" // TODO: replace with correct one

const client = createPublicClient({
  transport: http("https://monad-testnet.drpc.org")
})


const App = () => {
  const [userAddress, setUserAddress] = useState("");
  const [ethos, setEthos] = useState(null)
  const [ksmAdapter, setKmsAdapter] = useState("")
  const events = [] // TODO: replace with real ones

  const onSearch = useCallback(async () => {
    try {

      const [ethos, ksmAdapter] = await Promise.all([
        client.readContract({
          abi: deleGateAbi,
          address: DELEGATE_ADDRESS,
          functionName: 'getUserEthos',
          args: [userAddress]
        }),
        client.readContract({
          abi: deleGateAbi,
          address: DELEGATE_ADDRESS,
          functionName: 'getUserKmsAdapter',
          args: [userAddress]
        })
      ])

      setEthos({
        values: ethos.values.split(','),
        interests: ethos.interests.split(','),
        principles: ethos.principles.split(',')
      })
      setKmsAdapter(ksmAdapter)

      const startVoteCastsEvents = await client.getContractEvents({
        abi: deleGateAbi,
        address: DELEGATE_ADDRESS,
        eventName: 'StartVoteCast',
        args: [userAddress]
      })
      const promptIds = startVoteCastsEvents.map(({ promptId }) => promptId)

      const [askEvents, answerEvents] = await Promise.all([
        Promise.all(promptIds.map(promptId => client.getContractEvents({
          abi: llmAdapterAbi,
          address: LLM_ADAPTER_ADDRESS,
          eventName: 'Asked',
          args: [promptId]
        }))),
        Promise.all(promptIds.map(promptId => client.getContractEvents({
          abi: llmAdapterAbi,
          address: LLM_ADAPTER_ADDRESS,
          eventName: 'Answered',
          args: [promptId]
        })))
      ])

      console.log("askEvents", askEvents)
      console.log("answerEvents", answerEvents)

    } catch (err) {
      console.error(err)
    }
  }, [userAddress])

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">

      <header className="w-full border-b border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src="https://via.placeholder.com/32x32"
              alt="DeleGate Logo"
              className="h-8 w-8 rounded-md"
            />
            <span className="text-xl font-bold tracking-wide">
              DeleGate
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl p- space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-widest">
              DeleGate
            </h1>
            <p className="text-sm md:text-base text-gray-500 tracking-wide">
              bla bla bla bla
            </p>
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

          {ethos && <div className="border border-gray-200 rounded-xl p-4">
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1 text-sm">Principles</h3>
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

            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1 text-sm">Values</h3>
              <div className="flex flex-wrap gap-2">
                {ethos.values.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-block bg-green-50 text-green-600 px-3 py-1 text-xs font-semibold rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="">
              <h3 className="font-medium text-gray-700 mb-1 text-sm">Interests</h3>
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
          </div>}

          {events.length > 0 && <div className="border border-gray-200 rounded-xl p-4">
            <h2 className="text-xl font-semibold mb-4 tracking-wide">
              Past votes
            </h2>
            <table className="w-full text-left">
              <thead className="border-b border-gray-300 text-gray-600 uppercase text-xs tracking-wider">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Event Name</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-200 last:border-none hover:bg-gray-100 transition-colors"
                  >
                    <td className="py-2 text-sm">{event.id}</td>
                    <td className="py-2 text-sm font-medium">{event.name}</td>
                    <td className="py-2 text-sm">{event.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      </main>
    </div>
  );
}

export default App
