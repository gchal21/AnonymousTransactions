const { buildPoseidon } = require("circomlibjs");

(async () => {
    const args = process.argv.slice(2).map(BigInt); // read CLI arguments

    if (args.length === 0) {
        console.error("Usage: node poseidon.js <a> <b> <c> ...");
        process.exit(1);
    }

    const poseidon = await buildPoseidon();
    const hash = poseidon(args);

    // Convert to hex and pad to 32 bytes (64 hex characters)
    const hex = poseidon.F.toString(hash, 16); // base 16
    const paddedHex = hex.padStart(64, "0"); // 32 bytes = 64 hex characters

    console.log("0x" + paddedHex);
})();