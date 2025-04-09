const { buildPoseidon } = require("circomlibjs");

(async () => {
  const args = process.argv.slice(2).map(BigInt); // read CLI arguments

  if (args.length === 0) {
    console.error("Usage: node poseidon.js <a> <b> <c> ...");
    process.exit(1);
  }

  const poseidon = await buildPoseidon();
  const hash = poseidon(args);

  // Return the output as a BigInt string
  console.log(poseidon.F.toString(hash));
})();
