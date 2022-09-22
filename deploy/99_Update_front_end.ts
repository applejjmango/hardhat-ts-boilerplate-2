import fs from "fs"
import { ethers, network } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"

import { frontEndAbiLocation, frontEndContractsFile } from "../helper-hardhat-config"

const deployFunction: DeployFunction = async ({}) => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("updating front end...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Front End Written!!!")
  }
}

export default deployFunction

async function updateAbi() {
  const NFTMarketPlace = await ethers.getContract("NFTMarket")

  fs.writeFileSync(
    `${frontEndAbiLocation}NFTMarket.json`,
    NFTMarketPlace.interface.format(ethers.utils.FormatTypes.json)
  )
}

async function updateContractAddresses() {
  const NFTMarketPlace = await ethers.getContract("NFTMarket")
  console.log("NFTMarket address: ", NFTMarketPlace.address)

  const chainId = network.config.chainId
  console.log("chainId ", chainId)
  if (!chainId) return

  const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
  console.log("contractAddresses ", contractAddresses)

  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId]["NFTMarketPlace"].includes(NFTMarketPlace.address)) {
      contractAddresses[chainId]["NFTMarketPlace"].push(NFTMarketPlace.address)
    }
  } else {
    contractAddresses[chainId] = { NFTMarketPlace: [NFTMarketPlace.address] }
  }
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

deployFunction.tags = ["all", "frontend"]
