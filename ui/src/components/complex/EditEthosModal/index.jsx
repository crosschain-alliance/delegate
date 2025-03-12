import { useCallback, useEffect, useState } from "react"
import { useWalletClient } from "wagmi"

import { config } from "../../../main"
import deleGateAbi from "../../../utils/abi/deleGate.json"

import Modal from "../../base/Modal"
import settings from "../../../settings"
import { monadTestnet } from "viem/chains"
import { waitForTransactionReceipt } from "viem/actions"

const EditEthosModal = ({ currentEthos = {}, isOpen, onClose, onUpdated }) => {
  const [principles, setPrinciples] = useState("")
  const [values, setValues] = useState("")
  const [interests, setInterests] = useState("")

  const { data: walletClient } = useWalletClient({ config: config })

  useEffect(() => {
    if (isOpen) {
      setPrinciples(currentEthos?.principles || "")
      setValues(currentEthos?.values || "")
      setInterests(currentEthos?.interests || "")
    }
  }, [isOpen])

  const onUpdateEthos = useCallback(async () => {
    try {
      console.log(principles, values, interests)
      const txHash = await walletClient.writeContract({
        abi: deleGateAbi,
        address: settings.contractAddresses[monadTestnet.id].deleGate,
        functionName: "defineEthos",
        args: [[interests, principles, values]],
      })

      console.log("transaction hash:", txHash)

      await waitForTransactionReceipt(walletClient, {
        hash: txHash,
      })
      onUpdated()
    } catch (err) {
      console.error(err)
    }
  }, [principles, values, interests, onUpdated])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h3 className="text-lg font-semibold mb-4">Modify ethos</h3>

      <label className="block text-sm font-medium text-gray-700 mb-2">Please edit your principles:</label>
      <textarea
        value={principles}
        onChange={(e) => setPrinciples(e.target.value)}
        className="block w-full h-40 p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200 mb-4 resize-none"
      />

      <label className="block text-sm font-medium text-gray-700 mb-2">Please edit your values:</label>
      <textarea
        value={values}
        onChange={(e) => setValues(e.target.value)}
        className="block w-full h-40 p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200 mb-4 resize-none"
      />

      <label className="block text-sm font-medium text-gray-700 mb-2">Please edit your interests:</label>
      <textarea
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        className="block w-full h-40 p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200 mb-4 resize-none"
      />

      <div className="flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onUpdateEthos}
          className="px-3 py-1 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Update Ethos
        </button>
      </div>
    </Modal>
  )
}

export default EditEthosModal
