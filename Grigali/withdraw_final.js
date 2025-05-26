const { ethers } = require("ethers");
const { buildPoseidon } = require("circomlibjs");
const snarkjs = require("snarkjs");
const fs = require("fs");

/**
 * Grigali Withdraw Script
 * Usage: node withdraw.js <private_key> <backend_url> <contract_address> <rpc_url> <nullifier> [recipient_address]
 */

async function makeWithdrawal(privateKey, backendUrl, contractAddress, rpcUrl, nullifier, recipientAddress) {
  try {
    // Initialize ethers components
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey.startsWith("0x") ? privateKey : "0x" + privateKey, provider);

    // Contract ABI
    const contractABI = [
      "function withdraw(tuple(uint256[2] a, uint256[2][2] b, uint256[2] c) _proof, bytes32 _root, bytes32 _nullifierHash, address _recipient, address _relayer, uint256 _fee) external payable",
      "function isSpent(bytes32 _nullifierHash) external view returns (bool)",
      "function isKnownRoot(bytes32 _root) external view returns (bool)",
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    console.log("🚀 Initializing Grigali Withdrawal");
    console.log(`📍 Contract: ${contractAddress}`);
    console.log(`👤 Address: ${wallet.address}`);

    // Initialize Poseidon
    console.log("⏳ Initializing Poseidon hash function...");
    const poseidon = await buildPoseidon();

    const nullifierBigInt = BigInt(nullifier);
    const recipient = recipientAddress || wallet.address;

    // Helper function
    const toHex32 = (value) => {
      const hex = poseidon.F.toString(value, 16);
      return "0x" + hex.padStart(64, "0");
    };

    // Calculate commitment
    console.log("⏳ Calculating commitment...");
    const commitment = poseidon([nullifierBigInt, BigInt(0)]);
    const commitmentHex = toHex32(commitment);

    console.log(`🔐 Commitment: ${commitmentHex}`);
    console.log(`📤 Recipient: ${recipient}`);

    // Get merkle path from backend
    console.log("⏳ Fetching merkle path from backend...");
    const backendUrlClean = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    const response = await fetch(`${backendUrlClean}/api/v1/deposit/details/${commitmentHex}`);

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
    }

    const merkleData = await response.json();

    // Calculate nullifier hash
    console.log("⏳ Calculating nullifier hash...");
    const nullifierHash = poseidon([nullifierBigInt, BigInt(1), BigInt(merkleData.index)]);
    const nullifierHashHex = toHex32(nullifierHash);

    // Check if already spent
    console.log("⏳ Checking if already spent...");
    const isSpent = await contract.isSpent(nullifierHashHex);
    if (isSpent) {
      throw new Error("This nullifier has already been spent!");
    }

    // Verify root
    console.log("⏳ Verifying root...");
    const isValidRoot = await contract.isKnownRoot(merkleData.root);
    if (!isValidRoot) {
      throw new Error("Invalid merkle root!");
    }

    // Generate zero-knowledge proof
    console.log("⏳ Generating zero-knowledge proof...");
    const circuitWasm = "withdraw.wasm";
    const circuitZkey = "circuit_final.zkey";

    if (!fs.existsSync(circuitWasm) || !fs.existsSync(circuitZkey)) {
      throw new Error(`Circuit files not found. Please ensure ${circuitWasm} and ${circuitZkey} are in the current directory.`);
    }

    const proofInputs = {
      root: merkleData.root,
      nullifierHash: nullifierHashHex,
      recipient: recipient,
      relayer: ethers.ZeroAddress,
      fee: "0",
      nullifier: nullifier.toString(),
      pathElements: merkleData.path,
      pathIndices: merkleData.indices,
    };

    const { proof } = await snarkjs.groth16.fullProve(proofInputs, circuitWasm, circuitZkey);

    const formattedProof = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      c: [proof.pi_c[0], proof.pi_c[1]],
    };

    // Submit withdrawal transaction
    console.log("⏳ Submitting withdrawal transaction...");
    const tx = await contract.withdraw(
      formattedProof,
      merkleData.root,
      nullifierHashHex,
      recipient,
      ethers.ZeroAddress,
      0,
    );

    console.log(`📋 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Withdrawal confirmed in block ${receipt.blockNumber}`);
    console.log(`💰 Funds sent to: ${recipient}`);
    console.log("RETURN_VALUE: SUCCESS");

  } catch (error) {
    console.log("RETURN_VALUE: FAILED");
    process.exit(1);
  }
}

async function main() {
  if (process.argv.length < 7 || process.argv.length > 8) {
    console.log("Usage: node withdraw.js <private_key> <backend_url> <contract_address> <rpc_url> <nullifier> [recipient_address]");
    console.log("\nExample:");
    console.log("node withdraw.js 0x1234... http://localhost:5055 0xabc123... https://rpc.sepolia.org 12345");
    console.log("node withdraw.js 0x1234... http://localhost:5055 0xabc123... https://rpc.sepolia.org 12345 0xRecipient...");
    process.exit(1);
  }

  const [, , privateKey, backendUrl, contractAddress, rpcUrl, nullifier, recipientAddress] = process.argv;

  await makeWithdrawal(privateKey, backendUrl, contractAddress, rpcUrl, nullifier, recipientAddress);
}

if (require.main === module) {
  main().catch(console.error);
}