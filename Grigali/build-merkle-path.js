const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");

// Convert hex to decimal string (BigInt representation)
function hexToDecimalStr(hexStr) {
    // Remove 0x prefix if present
    if (hexStr.startsWith('0x')) {
        hexStr = hexStr.substring(2);
    }
    return BigInt('0x' + hexStr).toString();
}

// Hash function using Poseidon
async function hashLeftRight(left, right) {
    const poseidon = await buildPoseidon();

    // Convert hex strings to BigInt if they're not already BigInt
    const leftBigInt = typeof left === 'string' ? BigInt(left) : left;
    const rightBigInt = typeof right === 'string' ? BigInt(right) : right;

    const hash = poseidon([leftBigInt, rightBigInt]);
    return poseidon.F.toString(hash);
}

// Build Merkle path
async function buildMerklePath(leafHash, filledSubtrees, zeros, leafIndex) {
    const levels = filledSubtrees.length;
    const path = [];
    let currentLevelHash = leafHash;
    let currentIndex = BigInt(leafIndex);

    console.log(`Building merkle path for leaf at index ${currentIndex}`);

    for (let i = 0; i < levels; i++) {
        let left, right, pathElement, pathIndex;

        if (currentIndex % 2n === 0n) {
            left = currentLevelHash;
            right = zeros[i];
            pathElement = right;
            pathIndex = 0;
        } else {
            left = filledSubtrees[i];
            right = currentLevelHash;
            pathElement = left;
            pathIndex = 1;
        }

        // Add to path
        path.push({
            pathIndex: pathIndex,
            hash: pathElement
        });

        // Hash for next level
        currentLevelHash = await hashLeftRight(left, right);
        currentIndex = currentIndex / 2n;
    }

    return path;
}

// Format the path for proof generation
function formatPathForProof(path) {
    const pathElements = path.map(node => node.hash);
    const pathIndices = path.map(node => node.pathIndex);

    return {
        pathElements,
        pathIndices
    };
}

// Calculate the root from a leaf and its path
async function calculateRoot(leafHash, pathElements, pathIndices) {
    let currentHash = leafHash;

    for (let i = 0; i < pathElements.length; i++) {
        const pathElement = pathElements[i];

        if (pathIndices[i] === 0) {
            // Path element is on the right
            currentHash = await hashLeftRight(currentHash, pathElement);
        } else {
            // Path element is on the left
            currentHash = await hashLeftRight(pathElement, currentHash);
        }
    }

    return currentHash;
}

async function generateMerklePath(merkleData, leafHash) {
    try {
        console.log("Processing input data...");

        // Convert all values to decimal format if they're in hex
        let filledSubtrees = merkleData.filledSubtrees;
        let zeros = merkleData.zeros;
        let leafIndex = merkleData.nextIndex;

        // Check if they're hex strings and convert if needed
        if (filledSubtrees[0] && filledSubtrees[0].startsWith('0x')) {
            console.log("Converting filledSubtrees from hex to decimal...");
            filledSubtrees = filledSubtrees.map(hexToDecimalStr);
        }

        if (zeros[0] && zeros[0].startsWith('0x')) {
            console.log("Converting zeros from hex to decimal...");
            zeros = zeros.map(hexToDecimalStr);
        }

        // Convert leaf hash to decimal if it's hex
        if (leafHash.startsWith('0x')) {
            console.log("Converting leaf hash from hex to decimal...");
            leafHash = hexToDecimalStr(leafHash);
        }

        // Build the merkle path
        console.log(`Building Merkle path for leaf hash: ${leafHash} at index: ${leafIndex}`);
        const path = await buildMerklePath(leafHash, filledSubtrees, zeros, leafIndex);
        const formattedPath = formatPathForProof(path);

        // Calculate the root for verification
        const calculatedRoot = await calculateRoot(leafHash, formattedPath.pathElements, formattedPath.pathIndices);

        // Format the result
        const result = {
            pathElements: formattedPath.pathElements,
            pathIndices: formattedPath.pathIndices,
            root: calculatedRoot
        };

        // Print as formatted JSON
        console.log(JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Parse command line arguments
function parseArgs() {
    if (process.argv.length < 4) {
        console.log("Usage: node build-merkle-path.js <MERKLE_DATA_FILE_OR_JSON> <LEAF_HASH>");
        console.log("Example 1 (with file): node build-merkle-path.js ./merkle-data.json 0x28bb28a2c7566e896a177dc7328d4298d197973bcac177fb8291984a1cc43b7f");
        process.exit(1);
    }

    let merkleData;
    const merkleDataInput = process.argv[2];

    // Check if the input is a file or a JSON string
    try {
        if (merkleDataInput.startsWith('{')) {
            // It's likely a JSON string
            merkleData = JSON.parse(merkleDataInput);
        } else {
            // Assume it's a file path
            const fileContent = fs.readFileSync(merkleDataInput, 'utf8');
            merkleData = JSON.parse(fileContent);
        }
    } catch (error) {
        console.error("❌ Error parsing merkle data:", error.message);
        process.exit(1);
    }

    return {
        merkleData,
        leafHash: process.argv[3],
        leafIndex: process.argv.length > 4 ? process.argv[4] : "0"
    };
}

// Main function
async function main() {
    const { merkleData, leafHash } = parseArgs();
    await generateMerklePath(merkleData, leafHash);
}

// Run the script
main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
