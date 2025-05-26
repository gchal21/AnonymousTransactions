const { ethers } = require("ethers");
const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");

/**
 * Grigali Deposit Script
 * Usage: node deposit.js <private_key> <contract_address> <rpc_url> <nullifier>
 */

async function makeDeposit(privateKey, contractAddress, rpcUrl, nullifier) {
  try {
    // Initialize ethers components
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey.startsWith("0x") ? privateKey : "0x" + privateKey, provider);

    // Contract ABI
    const contractABI = [
      "function deposit(bytes32 _commitment) external payable",
      "function denomination() external view returns (uint256)",
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    console.log("🚀 Initializing Grigali Deposit");
    console.log(`📍 Contract: ${contractAddress}`);
    console.log(`👤 Address: ${wallet.address}`);

    // Initialize Poseidon
    console.log("⏳ Initializing Poseidon hash function...");
    const poseidon = await buildPoseidon();

    // Get denomination
    const denomination = await contract.denomination();
    console.log(`💰 Denomination: ${ethers.formatEther(denomination)} ETH`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💳 Your Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < denomination) {
      throw new Error("Insufficient balance for deposit");
    }

    // Generate commitment
    console.log("⏳ Generating commitment...");
    const nullifierBigInt = BigInt(nullifier);
    const commitment = poseidon([nullifierBigInt, BigInt(0)]);

    // Convert to hex
    const toHex32 = (value) => {
      const hex = poseidon.F.toString(value, 16);
      return "0x" + hex.padStart(64, "0");
    };

    const commitmentHex = toHex32(commitment);
    console.log(`🔐 Commitment: ${commitmentHex}`);

    // Send deposit transaction
    console.log("⏳ Sending deposit transaction...");
    const tx = await contract.deposit(commitmentHex, {
      value: denomination,
    });

    console.log(`📋 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Deposit confirmed in block ${receipt.blockNumber}`);

    console.log(`🔑 IMPORTANT: Remember your nullifier: ${nullifier}`);

    console.log("RETURN_VALUE: SUCCESS");

  } catch (error) {
    console.log("RETURN_VALUE: FAILED");
    process.exit(1);
  }
}

async function main() {
  if (process.argv.length !== 6) {
    console.log("Usage: node deposit.js <private_key> <contract_address> <rpc_url> <nullifier>");
    console.log("\nExample:");
    console.log("node deposit.js 0x1234... 0xabc123... https://rpc.sepolia.org 12345");
    process.exit(1);
  }

  const [, , privateKey, contractAddress, rpcUrl, nullifier] = process.argv;

  await makeDeposit(privateKey, contractAddress, rpcUrl, nullifier);
}

if (require.main === module) {
  main().catch(console.error);
}