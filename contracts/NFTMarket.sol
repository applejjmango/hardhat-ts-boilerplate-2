// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

error NFTMarket__TokenURIAlreadyUsed();
error NFTMarket__NotOwnerOfThisNFT();
error NFTMarket__ItemAlreadyListed();
error NFTMarket__PriceMustBeEqualToListingPrice(uint256 _listingPrice);
error NFTMarket__PriceMustBeGreaterThanZero();

contract NFTMarket is ERC721URIStorage, Ownable {
  event NFTItemCreated(
    uint256 indexed tokenId,
    address indexed creator,
    uint256 price,
    bool isListed
  );

  using Counters for Counters.Counter;

  Counters.Counter private _listedItems;
  Counters.Counter private _tokenIds;
  uint256 public listingPrice = 0.025 ether;

  mapping(string => bool) private _usedTokenURIs;
  mapping(uint256 => NFTItem) private _tokenIdToNFTItem;

  mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
  mapping(uint256 => uint256) private _tokenIdToOwnedIndex;

  uint256[] private _allNfts;
  mapping(uint256 => uint256) private _tokenIdToNFTIndex;

  struct NFTItem {
    uint256 tokenId;
    uint256 price;
    address creator;
    bool isListed;
  }

  constructor() ERC721("CreaturesNFT", "CNFT") {}

  // Only owner of this contract is allowed to call this function
  function setListingPrice(uint256 newPrice) external onlyOwner {
    if (newPrice <= 0) revert NFTMarket__PriceMustBeGreaterThanZero();
    listingPrice = newPrice;
  }

  function mintToken(string memory tokenURI, uint256 price) public payable returns (uint256) {
    if (isTokenURIExists(tokenURI)) {
      revert NFTMarket__TokenURIAlreadyUsed();
    }
    console.log("msg.value ", msg.value);
    console.log("listingPrice ", listingPrice);
    require(msg.value == listingPrice, "Price must be equal to listing price");

    _tokenIds.increment();
    _listedItems.increment();

    uint256 newTokenId = _tokenIds.current();

    _safeMint(msg.sender, newTokenId);
    _setTokenURI(newTokenId, tokenURI);

    _usedTokenURIs[tokenURI] = true;

    _createNFTItem(newTokenId, price);

    return newTokenId;
  }

  function burnToken(uint256 tokenId) public {
    _burn(tokenId);
  }

  function _createNFTItem(uint256 tokenId, uint256 price) private {
    require(price > 0, "Price must be at least 1 wei");

    _tokenIdToNFTItem[tokenId] = NFTItem(tokenId, price, msg.sender, true);

    emit NFTItemCreated(tokenId, msg.sender, price, true);
  }

  function buyNft(uint256 tokenId) public payable {
    uint256 price = _tokenIdToNFTItem[tokenId].price;
    address owner = ERC721.ownerOf(tokenId);

    require(msg.sender != owner, "You already own this NFT");
    require(msg.value == price, "Please submit the asking price");

    _tokenIdToNFTItem[tokenId].isListed = false;
    _listedItems.decrement();

    _transfer(owner, msg.sender, tokenId);
    payable(owner).transfer(msg.value);
  }

  function placeNFTOnSale(uint256 tokenId, uint256 newPrice) public payable {
    if (ERC721.ownerOf(tokenId) != msg.sender) {
      revert NFTMarket__NotOwnerOfThisNFT();
    }

    if (_tokenIdToNFTItem[tokenId].isListed) {
      revert NFTMarket__ItemAlreadyListed();
    }

    if (listingPrice != msg.value) {
      revert NFTMarket__PriceMustBeEqualToListingPrice(listingPrice);
    }

    _tokenIdToNFTItem[tokenId].isListed = true;
    _tokenIdToNFTItem[tokenId].price = newPrice;
    _listedItems.increment();
  }

  function totalSupply() public view returns (uint256) {
    return _allNfts.length;
  }

  function tokenByIndex(uint256 index) public view returns (uint256) {
    require(index < totalSupply(), "Index out of bounds");
    return _allNfts[index];
  }

  function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
    require(index < ERC721.balanceOf(owner), "Index out of bounds");
    return _ownedTokens[owner][index];
  }

  function isTokenURIExists(string memory tokenURI) public view returns (bool) {
    return _usedTokenURIs[tokenURI];
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override {
    super._beforeTokenTransfer(from, to, tokenId);

    // minting token
    if (from == address(0)) {
      _addTokenToAllTokensEnumeration(tokenId);
    } else if (from != to) {
      _removeTokenFromOwnerEnumeration(from, tokenId);
    }

    if (to == address(0)) {
      _removeTokenFromAllTokensEnumeration(tokenId);
    } else if (to != from) {
      _addTokenToOwnerEnumeration(to, tokenId);
    }
  }

  function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
    _tokenIdToNFTIndex[tokenId] = _allNfts.length;
    _allNfts.push(tokenId);
  }

  function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
    uint256 length = ERC721.balanceOf(to);
    _ownedTokens[to][length] = tokenId;
    _tokenIdToOwnedIndex[tokenId] = length;
  }

  function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
    uint256 lastTokenIndex = ERC721.balanceOf(from) - 1;
    uint256 tokenIndex = _tokenIdToOwnedIndex[tokenId];

    if (tokenIndex != lastTokenIndex) {
      uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];

      _ownedTokens[from][tokenIndex] = lastTokenId;
      _tokenIdToOwnedIndex[lastTokenId] = tokenIndex;
    }

    delete _tokenIdToOwnedIndex[tokenId];
    delete _ownedTokens[from][lastTokenIndex];
  }

  function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
    uint256 lastTokenIndex = _allNfts.length - 1;
    uint256 tokenIndex = _tokenIdToNFTIndex[tokenId];
    uint256 lastTokenId = _allNfts[lastTokenIndex];

    _allNfts[tokenIndex] = lastTokenId;
    _tokenIdToNFTIndex[lastTokenId] = tokenIndex;

    delete _tokenIdToNFTIndex[tokenId];
    _allNfts.pop();
  }

  function getAllNFTsOnSale() public view returns (NFTItem[] memory) {
    uint256 allItemsCounts = totalSupply();
    uint256 currentIndex = 0;

    NFTItem[] memory items = new NFTItem[](_listedItems.current());

    for (uint256 i = 0; i < allItemsCounts; i++) {
      uint256 tokenId = tokenByIndex(i);
      NFTItem storage item = _tokenIdToNFTItem[tokenId];

      if (item.isListed) {
        items[currentIndex] = item;
        currentIndex += 1;
      }
    }

    return items;
  }

  function getOwnedNFTs() public view returns (NFTItem[] memory) {
    uint256 ownedItemsCount = ERC721.balanceOf(msg.sender);
    NFTItem[] memory items = new NFTItem[](ownedItemsCount);

    for (uint256 i = 0; i < ownedItemsCount; i++) {
      uint256 tokenId = tokenOfOwnerByIndex(msg.sender, i);
      NFTItem storage item = _tokenIdToNFTItem[tokenId];
      items[i] = item;
    }

    return items;
  }

  function getNFTItem(uint256 tokenId) public view returns (NFTItem memory) {
    return _tokenIdToNFTItem[tokenId];
  }

  function listedItemsCount() public view returns (uint256) {
    return _listedItems.current();
  }

  function getTokenId() public view returns (uint256) {
    return _tokenIds.current();
  }
}
