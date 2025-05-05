# Anonymous ETH Transactions – Deployment Documentation

This document outlines the setup and deployment steps for the smart contracts used in the anonymous ETH transaction system, including the `Verifier`, `Poseidon Hasher`, and the main `EthGrigali` contract.

---

## Prerequisites
- Node.js 
- Circom and SnarkJS
- Solidity compiler 
- A testnet or local Ethereum network (we used Sepolia testnet)

---

## Step-by-Step Setup

### 1. **Generate and Deploy the Verifier**

The `Verifier` is generated from a compiled Circom circuit using [SnarkJS](https://github.com/iden3/snarkjs):


- Compile and deploy it using your framework (e.g., Hardhat/Remix).
- Copy the deployed contract address — you will need this as the **first parameter** when deploying `EthGrigali`.

---

### 2. **Generate Poseidon Hasher in Solidity**

If you used Poseidon in Circom, you need a Solidity-compatible version.

We used a Solidity implementation that:
- Accepts `bytes32[2]` as input
- Returns a `bytes32` Poseidon hash (see poseidon2.sol in contracts)



Once complete:
- Deploy this contract .
- Copy its deployed address — this is the **fourth parameter** (`_hasher`) for `EthGrigali`.

---

### 3. **Deploy the `EthGrigali` Contract**

```solidity
constructor(
    IVerifier _verifier,         // Verifier contract address
    uint256 _denomination,       // e.g. 1 ETH in wei
    uint32 _merkleTreeHeight,    // e.g. 20
    address _hasher              // Poseidon hasher contract address
)
```

Example deployment values:

```js
const verifierAddress = "0x..."; // Step 1 output
const denomination = ethers.utils.parseEther("1"); // 1 ETH
const treeHeight = 20;
const hasherAddress = "0x..."; // Step 2 output

const grigali = await EthGrigali.deploy(verifierAddress, denomination, treeHeight, hasherAddress);
```


In the merkle tree level 0 is root, when we talk about 20 level merkle tree, we mean that there are 21 layers, first (0th) layer is root and then 20 layers so the number of leaves is 2^20. In zeros array we store the hex values of ZERO_VALUE, in leaves we store the hex of the transaction. So the maximum amount of transactions we can make is the number of nodes on last layer, in case of 20 level Merkle tree it will be 2^20. 
