import { ConnectButton } from "@rainbow-me/rainbowkit"
import { IoIosArrowDown } from "react-icons/io"
import { Fragment } from "react"

const CustomConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
        chainModalOpen,
        ..._props
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== "loading"
        const connected =
          ready && account && chain && (!authenticationStatus || authenticationStatus === "authenticated")

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="pt-2 pb-2 pl-4 pr-4 bg-purple-200 text-purple-500 rounded-3xl font-semibold text-lg hover:text-opacity-50 cursor-pointer"
                  >
                    Connect
                  </button>
                )
              }

              /*if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="pt-2 pb-2 pl-4 pr-4 bg-red-200 text-red-500 hover:text-opacity-50 rounded-3xl ml-1 mr-2 text-lg font-semibold"
                        >
                          Wrong network
                        </button>
                      )
                    }*/

              return (
                <div className="flex justify-between items-center">
                  {!chain.unsupported && (
                    <button
                      onClick={openChainModal}
                      className="flex justify-between items-center bg-gray-100 hover:bg-gray-200 pt-1 pb-1 pl-2 pr-2 rounded-2xl ml-1 mr-2 cursor-pointer"
                      type="button"
                    >
                      {chain.hasIcon && (
                        <div height={24} width={24} className=" flex justify-between items-center">
                          {chain.iconUrl && (
                            <img
                              className="rounded-full"
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              height={24}
                              width={24}
                            />
                          )}
                          <IoIosArrowDown
                            className={`ml-0.5 h-4 w-4 transform transition-transform duration-200 ${
                              chainModalOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      )}
                    </button>
                  )}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="pt-1 pb-1 pl-2 pr-2 bg-gray-100 rounded-3xl text-md hover:bg-gray-200 text-gray-600 font-medium cursor-pointer"
                  >
                    {account.displayName}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

const Header = ({ withConnectButton }) => {
  return (
    <Fragment>
      {withConnectButton && (
        <div className="absolute bottom-0 w-full p-4 rounded-tr-3xl rounded-tl-3xl border border-gray-200 md:hidden">
          <CustomConnectButton />
        </div>
      )}
      <nav className="bg-white p-4">
        <div className="mx-auto flex justify-between items-center">
          <div className="flex items-center justify-center">
            <img src="./assets/png/robot.png" width={48} height={48} alt="logo" />
            <span className="p-1 md:p-2 rounded-xl text-gray-600 cursor-pointer font-medium ml-2 text-xl">
              DeleGate
            </span>
          </div>
          {withConnectButton && (
            <div className="md:flex space-x-4 hidden">
              <CustomConnectButton />
            </div>
          )}
        </div>
      </nav>
    </Fragment>
  )
}

export default Header
