import React, { useCallback } from "react"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useNavigate } from "react-router"

import Footer from "../../base/Footer"
import { sliceAddress } from "../../../utils/address"
import { getNickname } from "../../../utils/nicknames"

const DATA = [
  {
    address: "0x1eAB2d7c886890A60c03aBf9954e5586F22A19d8",
    nSubscriptions: 2,
    nVotes: 3
  },
  {
    address: "0xE6C2542904a67E1c87b1f76A8AbC949213b54414",
    nSubscriptions: 2,
    nVotes: 8
  }
]

const Home = () => {
  const { openConnectModal } = useConnectModal()
  const navigate = useNavigate()

  const onConnect = useCallback(async () => {
    try {
      openConnectModal && openConnectModal()
      navigate("dashboard")
    } catch (err) {
      console.error(err)
    }
  }, [openConnectModal, navigate])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center max-w-2xl mx-auto w-full">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Welcome to DeleGate</h1>

          <p className="text-lg text-gray-700 leading-relaxed mt-8">
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

          <div className="overflow-x-auto mt-18">
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
                {DATA.map(({address, nSubscriptions, nVotes}, index) => (
                  <tr
                    className="border-b border-gray-100 hover:bg-gray-100 transition-color cursor-pointer"
                    onClick={() => navigate(`address/${address}`)}
                    key={address + index}
                  >
                    <td className="py-3 px-2 text-left">{getNickname(address)}</td>
                    <td className="py-3 px-2 text-left">
                      <span className="underline text-blue-600 hover:text-blue-800">
                        {sliceAddress(address)}
                      </span>
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
