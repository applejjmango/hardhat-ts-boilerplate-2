import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert } from "chai"
import { deployments, network, ethers } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { NFTMarket } from "../../typechain"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("NftMarket Unit Tests", async function () {
      let accounts: SignerWithAddress[]
      let nftMarket: NFTMarket

      const tokenURI = "https://test.com"
      let _nftPrice = ethers.utils.parseEther("0.3").toString()
      let _listingPrice = ethers.utils.parseEther("0.025").toString()

      before(async () => {
        console.log("BeforeEach ...............................................")
        await deployments.fixture(["mocks", "nftmarket"])
        nftMarket = await ethers.getContract("NFTMarket")

        accounts = await ethers.getSigners()
      })

      describe("Mint token", () => {
        before(async () => {
          await nftMarket.mintToken(tokenURI, _nftPrice, {
            from: accounts[0].address,
            value: _listingPrice,
          })
        })
        it("owner of the first token should be address[0]", async () => {
          const owner = await nftMarket.ownerOf(1)
          assert.equal(owner, accounts[0].address, "Owner of token is not matching address[0]")
        })

        it("should have the same token URI", async () => {
          const actualTokenURI = await nftMarket.tokenURI(1)
          assert.equal(actualTokenURI, tokenURI, "Token URI is not same")
        })

        it("should not be possible to create a NFT with used tokenURI", async () => {
          try {
            await nftMarket.mintToken(tokenURI, _nftPrice, {
              from: accounts[0].address,
            })
          } catch (error) {
            assert(error, "Token URI is used before so it is not valid")
          }
        })

        it("should have one listed item", async () => {
          const listedItemCount = await nftMarket.listedItemsCount()
          assert.equal(listedItemCount.toNumber(), 1, "Listed items count is not 1")
        })

        it("should have create NFT item", async () => {
          const nftItem = await nftMarket.getNFTItem(1)

          assert.equal(nftItem.tokenId.toString(), "1", "Token id is not 1")
          assert.equal(nftItem.price.toString(), _nftPrice, "Nft price is not correct")
          assert.equal(
            nftItem.creator,
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "Creator is not account[0]"
          )
          assert.equal(nftItem.isListed, true, "Token is not listed")
        })
      })

      describe("Buy NFT", () => {
        before(async () => {
          const [owner, otherAccount] = await ethers.getSigners()
          await nftMarket.connect(otherAccount).buyNft(1, {
            from: otherAccount.address,
            value: _nftPrice,
          })
        })

        it("should unlist the item", async () => {
          const listedItem = await nftMarket.getNFTItem(1)
          assert.equal(listedItem.isListed, false, "Item is still listed")
        })

        it("should decrease listed items count", async () => {
          const listedItemsCount = await nftMarket.listedItemsCount()
          assert.equal(listedItemsCount.toNumber(), 0, "Count has not been decrement")
        })

        it("should change the owner", async () => {
          const currentOwner = await nftMarket.ownerOf(1)
          assert.equal(currentOwner, accounts[1].address, "Item is still listed")
        })
      })

      describe("Token transfers", () => {
        before(async () => {
          const [owner, addr1] = await ethers.getSigners()
          const tokenURI2 = "https://test2.com"
          await nftMarket.connect(owner).mintToken(tokenURI2, _nftPrice, {
            from: owner.address,
            value: _listingPrice,
          })
        })

        it("should have two NFTs created", async () => {
          const totalSupply = await nftMarket.totalSupply()
          assert.equal(totalSupply.toNumber(), 2, "Total supply of token is not correct")
        })

        it("should be able to retreive nft by index", async () => {
          const nftId1 = await nftMarket.tokenByIndex(0)
          const nftId2 = await nftMarket.tokenByIndex(1)

          assert.equal(nftId1.toNumber(), 1, "Nft id is wrong")
          assert.equal(nftId2.toNumber(), 2, "Nft id is wrong")
        })

        it("should have one listed NFT", async () => {
          const allNfts = await nftMarket.getAllNFTsOnSale()
          assert.equal(allNfts[0].tokenId.toNumber(), 2, "Nft has a wrong id")
        })

        // it("account[1] should have one owned NFT", async () => {
        //   const [owner, addr1] = await ethers.getSigners()

        //   const ownedNfts = await nftMarket.getOwnedNFTs({ from: addr1.address })
        //   console.log(ownedNfts)
        //   assert.equal(ownedNfts[0].tokenId.toNumber(), 1, "Nft has a wrong id")
        // })

        it("account[0] should have one owned NFT", async () => {
          const [owner, addr1] = await ethers.getSigners()
          const ownedNfts = await nftMarket.getOwnedNFTs({ from: owner.address })
          assert.equal(ownedNfts[0].tokenId.toNumber(), 2, "Nft has a wrong id")
        })
      })

      describe.only("Burn Token", async () => {
        before(async () => {
          const tokenURI = "https://test-json3.com"
          const [owner, addr1, addr2] = await ethers.getSigners()
          await nftMarket.mintToken(tokenURI, _nftPrice, {
            from: addr2.address,
            value: _listingPrice,
          })
        })

        it("account[2] should have one owned NFT", async () => {
          const ownedNfts = await nftMarket.getOwnedNFTs({ from: addr2.address })

          assert.equal(ownedNfts[0].tokenId.toNumber(), 3, "Nft has a wrong id")
        })

        it("account[2] should own 0 NFTs", async () => {
          await nftMarket.burnToken(3, { from: addr2.address })
          const ownedNfts = await nftMarket.getOwnedNFTs({ from: addr2.address })

          assert.equal(ownedNfts.length, 0, "Invalid length of tokens")
        })
      })
    })
