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

// Poseidon hash helper
async function poseidonHash(args) {
  const poseidon = await buildPoseidon();
  const hash = poseidon(args);
  const hex = poseidon.F.toString(hash, 16);
  return "0x" + hex.padStart(64, "0");
}

// Convert decimal string to hex string
function toHex32(decimalString) {
  const bn = BigInt(decimalString);
  const hex = bn.toString(16);
  return "0x" + hex.padStart(64, "0");
}

// Get merkle path from backend or use hardcoded for testing
async function getMerklePath(commitment, backendUrl = null) {
  if (backendUrl) {
    // Fetch from backend
    const response = await fetch(`${backendUrl}/merkle-path/${commitment}`);
    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }
    return await response.json();
  } else {
    // Use hardcoded path for your single deposit at index 0
    console.log("Using hardcoded merkle path for testing...");
    return {
      pathElements: [
        "21663839004416932945382355908790599225266501822907911457504978515578255421292",
        "8995896153219992062710898675021891003404871425075198597897889079729967997688",
        "15126246733515326086631621937388047923581111613947275249184377560170833782629",
        "6404200169958188928270149728908101781856690902670925316782889389790091378414",
        "17903822129909817717122288064678017104411031693253675943446999432073303897479",
        "11423673436710698439362231088473903829893023095386581732682931796661338615804",
        "10494842461667482273766668782207799332467432901404302674544629280016211342367",
        "17400501067905286947724900644309270241576392716005448085614420258732805558809",
        "7924095784194248701091699324325620647610183513781643345297447650838438175245",
        "3170907381568164996048434627595073437765146540390351066869729445199396390350",
        "21224698076141654110749227566074000819685780865045032659353546489395159395031",
        "18113275293366123216771546175954550524914431153457717566389477633419482708807",
        "1952712013602708178570747052202251655221844679392349715649271315658568301659",
        "18071586466641072671725723167170872238457150900980957071031663421538421560166",
        "9993139859464142980356243228522899168680191731482953959604385644693217291503",
        "14825089209834329031146290681677780462512538924857394026404638992248153156554",
        "4227387664466178643628175945231814400524887119677268757709033164980107894508",
        "177945332589823419436506514313470826662740485666603469953512016396504401819",
        "4236715569920417171293504597566056255435509785944924295068274306682611080863",
        "8055374341341620501424923482910636721817757020788836089492629714380498049891",
      ],
      pathIndices: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      root: "10932995710622753327622962915315300407168694450908827721209199963830052682775",
      leafIndex: 0,
    };
  }
}

// Main withdrawal function
async function withdraw(
  privateKey,
  grigaliAddress,
  rpcUrl,
  nullifier,
  backendUrl = null,
) {
  try {
    console.log("=== Grigali Withdrawal Process ===\n");

    // 1. Setup
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(
      privateKey.startsWith("0x") ? privateKey : "0x" + privateKey,
      provider,
    );
    const grigali = new ethers.Contract(grigaliAddress, grigaliABI, wallet);

    console.log("Recipient address:", wallet.address);
    console.log("Nullifier:", nullifier);

    // 2. Calculate commitment (Grigali uses poseidon(nullifier, 0))
    const nullifierBn = BigInt(nullifier);

    // Using your hardcoded commitment
    const commitment =
      "18423194802802147121294641945063302532319431080857859605204660473644265519999";
    const commitmentHex = toHex32(commitment);
    console.log("Commitment (decimal):", commitment);
    console.log("Commitment (hex):", commitmentHex);

    // 3. Get merkle path
    console.log("\nFetching merkle path...");
    const merkleData = await getMerklePath(commitment, backendUrl);
    const rootHex = toHex32(merkleData.root);
    console.log("Root (decimal):", merkleData.root);
    console.log("Root (hex):", rootHex);
    console.log("Leaf index:", merkleData.leafIndex);

    // 4. Calculate nullifier hash
    // Using your hardcoded nullifier hash
    const nullifierHash =
      "10105579204983676368525914022433560583775695731176684732022082319989404986846";
    const nullifierHashHex = toHex32(nullifierHash);
    console.log("Nullifier hash (decimal):", nullifierHash);
    console.log("Nullifier hash (hex):", nullifierHashHex);

    // 5. Check if already spent
    console.log("\nChecking if note is spent...");
    const isSpent = await grigali.isSpent(nullifierHashHex);
    if (isSpent) {
      throw new Error("Note has already been spent!");
    }
    console.log("✓ Note has not been spent");

    // 6. Verify merkle root
    console.log("\nVerifying merkle root...");
    const isValidRoot = await grigali.isKnownRoot(rootHex);
    if (!isValidRoot) {
      throw new Error("Invalid merkle root! Root not recognized by contract.");
    }
    console.log("✓ Root is valid");

    // 7. Generate zero-knowledge proof
    console.log("\nGenerating zero-knowledge proof...");

    const input = {
      // Public inputs
      root: merkleData.root,
      nullifierHash: nullifierHash,
      recipient: BigInt(wallet.address).toString(),
      relayer: BigInt(ethers.ZeroAddress).toString(),
      fee: "500000",

      // Private inputs
      nullifier: nullifierBn.toString(),
      pathElements: merkleData.pathElements,
      pathIndices: merkleData.pathIndices.map((i) => i.toString()),
    };
    console.log(input);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      "withdraw.wasm",
      "circuit_final.zkey",
    );

    console.log("✓ Proof generated successfully");

    // 8. Format proof for Solidity
    const solidityProof = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      c: [proof.pi_c[0], proof.pi_c[1]],
    };

    // 9. Submit withdrawal transaction
    console.log("\nSubmitting withdrawal transaction...");

    const tx = await grigali.withdraw(
      solidityProof,
      rootHex, // Convert to hex before passing
      nullifierHashHex, // Convert to hex before passing
      wallet.address,
      ethers.ZeroAddress,
      500000, // fee
      {
        gasLimit: 500000n,
      },
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("\n✅ Withdrawal successful!");
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // 10. Get withdrawal amount
    try {
      const denomination = await grigali.denomination();
      console.log("Amount withdrawn:", ethers.formatEther(denomination), "ETH");
    } catch (e) {
      console.log("Amount withdrawn: Check transaction for details");
    }

    return {
      success: true,
      txHash: receipt.hash,
      recipient: wallet.address,
    };
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log(
      "Usage: node withdraw-fixed.js <PRIVATE_KEY> <GRIGALI_ADDRESS> <RPC_URL> <NULLIFIER> [BACKEND_URL]",
    );
    console.log("\nExample:");
    console.log(
      "  node withdraw-fixed.js 0x... 0x53f5... https://rpc.sepolia.org 1",
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

  const [privateKey, grigaliAddress, rpcUrl, nullifier, backendUrl] = args;

  // Validate inputs
  if (!ethers.isAddress(grigaliAddress)) {
    console.error("Invalid Grigali contract address");
    process.exit(1);
  }

  // Execute withdrawal
  await withdraw(privateKey, grigaliAddress, rpcUrl, nullifier, backendUrl);
}

if (require.main === module) {
  main().catch(console.error);
}
