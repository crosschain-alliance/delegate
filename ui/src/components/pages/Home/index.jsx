import React, { useCallback, useEffect, useState } from "react"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useNavigate } from "react-router"
import { useAccount, useWalletClient } from "wagmi"

import Footer from "../../base/Footer"
import { sliceAddress } from "../../../utils/address"
import { getNickname } from "../../../utils/nicknames"
import settings from "../../../settings"

const Home = () => {
  const { openConnectModal } = useConnectModal()
  const navigate = useNavigate()
  const connectedAccount = useAccount()
  const [pressed, setPressed] = useState(0)

  const onConnect = useCallback(async () => {
    try {
      openConnectModal && openConnectModal()
      setPressed(1)
    } catch (err) {
      console.error(err)
    }
  }, [openConnectModal, navigate])

  useEffect(() => {
    if (connectedAccount.address && pressed) {
      navigate("dashboard")
    }
  }, [connectedAccount, pressed])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center max-w-2xl mx-auto w-full">
          <div className="flex flex-col items-center justify-center">
            <img src="./assets/png/robot.png" className="mr-6" width={128} height={64} alt="logo" />
            <h1 className="text-6xl font-bold text-gray-800 mb-4 mt-4">Welcome to DeleGate</h1>
          </div>

          <p className=" bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-lg">
            Please{" "}
            <span
              className="text-blue-600 underline hover:text-blue-800 transition-colors cursor-pointer"
              onClick={onConnect}
            >
              connect your wallet
            </span>{" "}
            or choose a DeleGate <br />
            user below to monitor the activity
          </p>

          <div className="overflow-x-auto mt-10">
            <table className="w-full text-base text-gray-600 border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 text-left font-medium px-2">DeleGate User</th>
                  <th className="py-3 text-left font-medium px-2">Owner</th>
                  <th className="py-3 text-left font-medium px-2">Subscribed DAOs</th>
                  <th className="py-3 text-left font-medium px-2"># Votes Casted</th>
                </tr>
              </thead>
              <tbody>
                {settings.data.map(({ address, nSubscriptions, nVotes }, index) => (
                  <tr
                    className="border-b border-gray-100 hover:bg-gray-100 transition-color cursor-pointer"
                    onClick={() => navigate(`address/${address}`)}
                    key={address + index}
                  >
                    <td className="py-3 px-2 text-left">{getNickname(address)}</td>
                    <td className="py-3 px-2 text-left">
                      <span className="underline text-blue-600 hover:text-blue-800">{sliceAddress(address)}</span>
                    </td>
                    <td className="py-3 px-2 text-left">{nSubscriptions}</td>
                    <td className="py-3 px-2 text-left">{nVotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Home
