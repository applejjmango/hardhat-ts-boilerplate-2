// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFTMarket is ERC721URIStorage {
  constructor() ERC721("CreaturesNFT", "CNFT") {}
}
