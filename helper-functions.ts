import { ethers, network, run } from "hardhat"
import { networkConfig } from "./helper-hardhat-config"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { BigNumber, constants } from "ethers"

export const autoFundCheck = async (
  contractAddr: string,
  networkName: string,
  additionalMessage: string
) => {
  const chainId: number | undefined = network.config.chainId

  console.log("Checking to see if contract can be auto-funded with LINK:")

  if (!chainId) return
  const amount: BigNumber = networkConfig[chainId].fundAmount

  const accounts: SignerWithAddress[] = await ethers.getSigners()
  const signer: SignerWithAddress = accounts[0]
}

export const verify = async (contractAddress: string, args: any[]) => {
  console.log("Verifying contract...")
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    })
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!")
    } else {
      console.log(e)
    }
  }
}
