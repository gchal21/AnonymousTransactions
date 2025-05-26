const { ethers } = require("ethers");
const { buildPoseidon } = require("circomlibjs");
const snarkjs = require("snarkjs");
const fs = require("fs");

// Contract ABI
const grigaliABI = [
    "function withdraw(tuple(uint256[2] a, uint256[2][2] b, uint256[2] c) _proof, bytes32 _root, bytes32 _nullifierHash, address _recipient, address _relayer, uint256 _fee) external payable",
    "function isSpent(bytes32 _nullifierHash) external view returns (bool)",
    "function isKnownRoot(bytes32 _root) external view returns (bool)",
    "function denomination() external view returns (uint256)",
];

// Convert decimal string to hex string
function toHex32(decimalString) {
    const bn = BigInt(decimalString);
    const hex = bn.toString(16);
    return "0x" + hex.padStart(64, "0");
}

// Parse base64 input JSON
function parseInputJson(base64String) {
    const jsonBuffer = Buffer.from(base64String, 'base64');
    const jsonString = jsonBuffer.toString('utf-8');
    return JSON.parse(jsonString);
}

// Main withdrawal function
async function withdraw(
    privateKey,
    grigaliAddress,
    rpcUrl,
    inputBase64
) {
    try {
        console.log("=== Grigali Withdrawal Process ===\n");

        // 1. Parse input JSON
        const input = parseInputJson(inputBase64);
        console.log("Input JSON parsed successfully");

        // 2. Setup
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(
            privateKey.startsWith("0x") ? privateKey : "0x" + privateKey,
            provider
        );
        const grigali = new ethers.Contract(grigaliAddress, grigaliABI, wallet);

        // 3. Prepare values
        const rootHex = toHex32(input.root);
        const nullifierHashHex = toHex32(input.nullifierHash);
        const recipient = input.recipient || wallet.address;
        const relayer = input.relayer || ethers.ZeroAddress;
        const fee = BigInt(input.fee || "0");

        console.log("Recipient address:", recipient);
        console.log("Root (decimal):", input.root);
        console.log("Root (hex):", rootHex);
        console.log("Nullifier hash (decimal):", input.nullifierHash);
        console.log("Nullifier hash (hex):", nullifierHashHex);

        // 4. Check if already spent
        console.log("\nChecking if note is spent...");
        const isSpent = await grigali.isSpent(nullifierHashHex);
        if (isSpent) {
            throw new Error("Note has already been spent!");
        }
        console.log("✓ Note has not been spent");

        // 5. Verify merkle root
        console.log("\nVerifying merkle root...");
        const isValidRoot = await grigali.isKnownRoot(rootHex);
        if (!isValidRoot) {
            throw new Error("Invalid merkle root! Root not recognized by contract.");
        }
        console.log("✓ Root is valid");

        // 6. Generate zero-knowledge proof
        console.log("\nGenerating zero-knowledge proof...");

        const zkInput = {
            // Public inputs
            root: input.root,
            nullifierHash: input.nullifierHash,
            recipient: BigInt(recipient).toString(),
            relayer: BigInt(relayer).toString(),
            fee: input.fee,

            // Private inputs
            nullifier: input.nullifier,
            pathElements: input.pathElements,
            pathIndices: input.pathIndices.map(i => i.toString())
        };
        console.log("Proof input prepared");

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            zkInput,
            "withdraw.wasm",
            "circuit_final.zkey"
        );

        console.log("✓ Proof generated successfully");

        // 7. Format proof for Solidity
        const solidityProof = {
            a: [proof.pi_a[0], proof.pi_a[1]],
            b: [
                [proof.pi_b[0][1], proof.pi_b[0][0]],
                [proof.pi_b[1][1], proof.pi_b[1][0]]
            ],
            c: [proof.pi_c[0], proof.pi_c[1]]
        };

        // 8. Submit withdrawal transaction
        console.log("\nSubmitting withdrawal transaction...");

        const tx = await grigali.withdraw(
            solidityProof,
            rootHex,
            nullifierHashHex,
            recipient,
            relayer,
            fee,
            {
                gasLimit: 500000n
            }
        );

        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("\n✅ Withdrawal successful!");
        console.log("Block number:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());

        // 9. Get withdrawal amount
        try {
            const denomination = await grigali.denomination();
            console.log("Amount withdrawn:", ethers.formatEther(denomination), "ETH");
        } catch (e) {
            console.log("Amount withdrawn: Check transaction for details");
        }

        return {
            success: true,
            txHash: receipt.hash,
            recipient: recipient
        };
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
        return {
            success: false,
            error: error.message
        };
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.log(
            "Usage: node withdraw.js <PRIVATE_KEY> <GRIGALI_ADDRESS> <RPC_URL> <INPUT_JSON_BASE64>"
        );
        console.log("\nExample:");
        console.log(
            "  node withdraw.js 0x... 0x53f5... https://rpc.sepolia.org eyJudWxsaWZpZXIiOiIxIiwgLi4ufQ=="
        );
        process.exit(1);
    }

    // Check for circuit files
    if (!fs.existsSync("withdraw.wasm") || !fs.existsSync("circuit_final.zkey")) {
        console.error("\n❌ Circuit files not found!");
        console.error("Please ensure these files exist in the current directory:");
        console.error("  - withdraw.wasm");
        console.error("  - circuit_final.zkey");
        process.exit(1);
    }

    const [privateKey, grigaliAddress, rpcUrl, inputBase64] = args;

    // Validate inputs
    if (!ethers.isAddress(grigaliAddress)) {
        console.error("Invalid Grigali contract address");
        process.exit(1);
    }

    try {
        // Validate base64 input
        parseInputJson(inputBase64);
    } catch (error) {
        console.error("Invalid base64 JSON input:", error.message);
        process.exit(1);
    }

    // Execute withdrawal
    await withdraw(privateKey, grigaliAddress, rpcUrl, inputBase64);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { withdraw };
