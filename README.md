# Buying Nexus Mutual covers for wNXM

Nexus Mutual coves can be purchased from official web site [here](https://app.nexusmutual.io/cover). You can pay with ETH/DAI or native NXM token. The price would be identical. But there is also a community driven wNXM token which is bound to native NXM at constant 1:1 ratio. Unlike native NXM which requires it's holders to come through KYC procedure, wNXM has no that kind of restrictions and is openly traded on DEXes at much lower price. So, buying protections for wNXM could be much cheaper.

# Implementation details

This project implements [Distributor2.sol](contracts/nexusmutual/modules/distributor/Distributor2.sol) contract which sells tokenised Nexus Mutual covers for ETH/DAI/NXM and wNXM. In Nexus Protocol cover buyers have to be authorised (which requires KYC procedure). Protection tokenisation is a way to allow authorised third party (an owner of Distributor2 contract) to buy and hold protections, then resell rights to claim cover amount to its users, leaving legal procedures on reseller. Technically, reseller might not require KYC at all. When user buys the cover via Distributor2 contract, s/he's issued an NFT token with the cover ID. This NFT to be presented when user attempts to fill the claim and get coverage payout. 

The flow how to buy Nexus Mutual cover with wNXM using Distributor2 contract:

1. get some wNXM. Either from DEXes (balancer, for example) or from CEXes. 
2. Obtain cover quotation from the Nexus backend. 
3. approve wNXM usage by Distributor2 contract
4. call buyCoverWNXM and feed quotation data. 
5. Get an NFT token with protection ID (you can use it to deal with your protection via Distributor2 contract). 

This flow is implemented in buyProtectionWNXM.js test. 
# Restrictions

Distributor is a contract that operates native NXM tokens. It has to be whitelisted to be able to do that, which requires owner KYC. Be ready to provide your documents in case you want to have your own Distributor instance in mainnet! 

## Deployments

Currently this project code is deployed to Kovan only. 

Distributor2 contract: [0x61aD80c1d39B0d1390E8D66935e39Eb5e4fFA138](https://www.notion.so/d39b0d1390e8d66935e39eb5e4ffa138)

Example of the transaction buying Nexus cover for wNXM: [0x4a73c95507c5b5a7109dfbe78184dd632b76f57be54bf336ee28f8c7dca03007](https://www.notion.so/2b76f57be54bf336ee28f8c7dca03007)

There is no any DEX trading pairs for wNXM in Kovan. So, in order to grab some wNXM the one has to:

1. whitelist own address with SelfKYC provider by invoking JoinMutual function of [this smart contract](https://kovan.etherscan.io/address/0x74e0BE134744cA896196796A58203D090bc791fE#writeContract) and paying 0.002 ETH of entrance fee (this is required for the next step). 
2. Buy NXM token with ETH from the Nexus pool by invoking buyNXM function and sending some ETH. Pool contract is [here](https://www.notion.so/f1144c34c061bff3222a431cec5aeec1)
3. Wrap NXM to wNXM with wNXM contract by invoking wrap function of the smart contract [here](https://www.notion.so/8851cbde4a39a7ac6ee47bad0b050717).

or... tweet me @ mtiutin if you need some wNXM tokens to play with.