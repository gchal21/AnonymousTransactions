const { ethers } = require("ethers");
const crypto = require("crypto");
const fs = require("fs");

// Contract ABIs
const grigaliABI = [
  "function deposit(bytes32 _commitment) external payable",
  "function denomination() external view returns (uint256)",
];

const hasherABI = [
  "function poseidon(bytes32[2] calldata leftRight) external pure returns (bytes32)",
];

async function deposit(
  privateKey,
  grigaliAddress,
  hasherAddress,
  rpcUrl,
  commitmentHex,
) {
  try {
    console.log("Starting deposit process...\n");

    // 1. Connect to network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log("Connected to network:", rpcUrl);

    // 2. Create wallet from private key - ensure proper formatting
    if (!privateKey.startsWith("0x")) {
      privateKey = "0x" + privateKey;
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Wallet address:", wallet.address);

    // 3. Check wallet balance using provider
    const balance = await provider.getBalance(wallet.address);
    console.log("Wallet balance:", balance.toString(), "wei");
    console.log("Wallet balance:", ethers.formatEther(balance), "ETH\n");

    // 4. Connect to contracts
    const grigali = new ethers.Contract(grigaliAddress, grigaliABI, wallet);
    const hasher = new ethers.Contract(hasherAddress, hasherABI, provider);

    // 5. Get denomination from contract
    const denomination = await grigali.denomination();
    console.log("Contract denomination:", denomination.toString(), "wei");
    console.log(
      "Contract denomination:",
      ethers.formatEther(denomination),
      "ETH\n",
    );

    // 6. Generate random nullifier and secret
    const nullifierBytes = crypto.randomBytes(31);
    const secretBytes = crypto.randomBytes(31);
    const nullifier = BigInt("0x" + nullifierBytes.toString("hex"));
    const secret = BigInt("0x" + secretBytes.toString("hex"));
    console.log("Generated random values");

    // 7. Estimate gas
    console.log("Estimating gas...");
    try {
      const estimatedGas = await grigali.deposit.estimateGas(commitmentHex, {
        value: denomination,
      });
      const gasLimit = (estimatedGas * 120n) / 100n; // Add 20% buffer
      console.log("Estimated gas:", estimatedGas.toString());
      console.log("Gas limit (with buffer):", gasLimit.toString());

      // Get gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || (await provider.getGasPrice());
      console.log("Gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

      // Check if wallet has enough for deposit + gas
      const totalNeeded = denomination + gasLimit * gasPrice;
      console.log(
        "\nTotal needed (deposit + gas):",
        totalNeeded.toString(),
        "wei",
      );
      console.log(
        "Total needed (deposit + gas):",
        ethers.formatEther(totalNeeded),
        "ETH",
      );

      if (balance < totalNeeded) {
        throw new Error(
          `Insufficient funds! Need ${ethers.formatEther(totalNeeded)} ETH but have ${ethers.formatEther(balance)} ETH`,
        );
      }

      // 8. Send deposit transaction
      console.log(
        `\nDepositing ${denomination.toString()} wei (${ethers.formatEther(denomination)} ETH)...`,
      );
      const tx = await grigali.deposit(commitmentHex, {
        value: denomination,
        gasLimit: gasLimit,
      });

      console.log("Transaction sent:", tx.hash);
      console.log("Waiting for confirmation...");

      // 9. Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("\nDeposit successful!");
      console.log("Block number:", receipt.blockNumber);
      console.log("Gas used:", receipt.gasUsed.toString());

      // Calculate actual gas cost
      const gasCost = receipt.gasUsed * (receipt.gasPrice || gasPrice);
      console.log("Gas cost:", ethers.formatEther(gasCost), "ETH");

      // 10. Extract leaf index from event
      let leafIndex = null;
      for (const log of receipt.logs) {
        try {
          const parsed = grigali.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          if (parsed && parsed.name === "Deposit") {
            leafIndex = parsed.args.leafIndex.toString();
            console.log("Leaf index:", leafIndex);
            break;
          }
        } catch (e) {
          // Continue to next log
        }
      }

      return {
        success: true,
        txHash: receipt.hash,
        leafIndex: leafIndex,
      };
    } catch (gasError) {
      console.error("Gas estimation failed:", gasError.message);
      // Try with default gas limit
      console.log("Trying with default gas limit...");

      const tx = await grigali.deposit(commitmentHex, {
        value: denomination,
        gasLimit: 500000n,
      });

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed!");

      return {
        success: true,
        txHash: receipt.hash,
      };
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("Stack trace:", error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length !== 5) {
    console.log(
      "Usage: node deposit-v6-fixed.js <PRIVATE_KEY> <GRIGALI_ADDRESS> <HASHER_ADDRESS> <RPC_URL>",
    );
    console.log("\nExample:");
    console.log(
      "node deposit-v6-fixed.js 0x123... 0xabc... 0xdef... https://rpc.sepolia.org",
    );
    console.log(
      "\nNote: The deposit amount will be fetched from the contract's denomination",
    );
    process.exit(1);
  }

  return {
    privateKey: args[0],
    grigaliAddress: args[1],
    hasherAddress: args[2],
    rpcUrl: args[3],
    commitmentHex: args[4],
  };
}

// Main function
async function main() {
  console.log("Grigali Deposit Script (Ethers v6)\n");

  const params = parseArgs();

  // Validate addresses
  if (!ethers.isAddress(params.grigaliAddress)) {
    console.error("Invalid Grigali contract address");
    process.exit(1);
  }

  if (!ethers.isAddress(params.hasherAddress)) {
    console.error("Invalid Hasher contract address");
    process.exit(1);
  }

  // Execute deposit
  const result = await deposit(
    params.privateKey,
    params.grigaliAddress,
    params.hasherAddress,
    params.rpcUrl,
    params.commitmentHex,
  );

  if (!result.success) {
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deposit };
