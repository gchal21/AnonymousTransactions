const { ethers } = require("ethers");

// ABI for the functions we need to call
const contractABI = [
    "function getFilledSubtree() external view returns (bytes32[] memory)",
    "function getZeros() external view returns (bytes32[] memory)",
    "function nextIndex() external view returns (uint32)"
];

async function getMerkleTreeData(contractAddress, rpcUrl) {
    try {
        console.log(`Connecting to ${rpcUrl}...`);
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        console.log(`Interacting with contract: ${contractAddress}`);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);

        console.log("Fetching data...");

        const [filledSubtrees, zeros, nextIndex] = await Promise.all([
            contract.getFilledSubtree(),
            contract.getZeros(),
            contract.nextIndex()
        ]);

        // Format the result
        const result = {
            filledSubtrees: filledSubtrees.map(tree => tree.toString()),
            zeros: zeros.map(zero => zero.toString()),
            nextIndex: Number(nextIndex)
        };

        console.log(JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

function parseArgs() {
    if (process.argv.length < 4) {
        console.log("Usage: node get-merkle-data.js <CONTRACT_ADDRESS> <RPC_URL>");
        console.log("Example: node get-merkle-data.js 0x1234...5678 https://ethereum-sepolia-rpc.publicnode.com");
        process.exit(1);
    }

    return {
        contractAddress: process.argv[2],
        rpcUrl: process.argv[3]
    };
}

async function main() {
    const { contractAddress, rpcUrl } = parseArgs();
    await getMerkleTreeData(contractAddress, rpcUrl);
}

main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
