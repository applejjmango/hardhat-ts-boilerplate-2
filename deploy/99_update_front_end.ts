import fs from "fs"
import { ethers, network } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"

import { frontEndAbiLocation, frontEndContractsLocation } from "../helper-hardhat-config"

const deployFunction: DeployFunction = async ({}) => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Getting updated contract address and ABI...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Finished fetching new contract address and ABI!!!")
  }
}

export default deployFunction

let contractName = "NFTMarket"

async function updateAbi() {
  const NFTMarketPlace = await ethers.getContract(`${contractName}`)

  fs.writeFileSync(
    `${frontEndAbiLocation} ${contractName}Abi.json`,
    NFTMarketPlace.interface.format(ethers.utils.FormatTypes.json)
  )
}

async function updateContractAddresses() {
  let contractAddresses
  const NFTMarketPlace = await ethers.getContract("NFTMarket")
  console.log(`${contractName} address: `, NFTMarketPlace.address)

  const chainId: number | undefined = network.config.chainId
  console.log("chainId ", chainId)
  if (!chainId) return

  // create json file if not exist
  if (!fs.existsSync(`${frontEndContractsLocation}${contractName}.json`)) {
    fs.writeFileSync(`${frontEndContractsLocation}${contractName}.json`, JSON.stringify({}))
  }

  contractAddresses = JSON.parse(
    fs.readFileSync(`${frontEndContractsLocation}${contractName}.json`, "utf8")
  )

  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId]["NFTMarketPlace"].includes(NFTMarketPlace.address)) {
      contractAddresses[chainId]["NFTMarketPlace"].push(NFTMarketPlace.address)
    }
  } else {
    contractAddresses[chainId] = { NFTMarketPlace: [NFTMarketPlace.address] }
  }
  fs.writeFileSync(
    `${frontEndContractsLocation} ${contractName}.json`,
    JSON.stringify(contractAddresses)
  )
}

deployFunction.tags = ["all", "frontend"]
