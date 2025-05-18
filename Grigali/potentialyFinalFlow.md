Grigali address with final values: 0x5D562eD3be0307F52be48C71873652C58Efe4112
poseidon hasher address: 0xC0E119Df844868CA90AC978163475001B666d090
zk-snark proof verifier: 0x3f74177fde50cb57fe25ac002088d7a79d748be4

current grigali is working on 0.1 Eth denomination

1) კოტლინის მხარეს დაგენერირდა გრანდიოზული რიცხვი რენდომ რიცხვი
   ეს რიცხვი დაიჰეშა poseidon.js ით 0 ანთან. ეს არის ქომითმენტი.
2) ვუშვებთ get-merkle-data.js-სს, რომელიც გვიბრუნებს (filledSubtrees, zeros, nextIndex).
   usage: node get-merkle-data.js <commitment> <rpc node>
3) ამის შემდგომ ვიძახებთ deposit.js-ს
   usage: node deposit.js <account private key (decimal)> <grigali address 0x...> <rpc node> <commitment 0x.. (poseidon.js - ით) და უნდა გადაიქცეს ჰექსად>
4) ამის შემდგომ ვიძახებთ build-merkle-path.js-ს
   usage: node build-merkle-path.js ./input-data.json (get-merkle-data.js-ს დაბრუნებული ობიექტი) <commitment hex>
5) უნდა აეწყოს input.json, რომელიც გამოიყურება შემდეგნაირად:

   {
   "nullifier": "1", (Guid რომელიც ზევით დავაგენერირეთ)
   "nullifierHash": "1 (decimal არის) ", (Poseidon(nullifier, 1, leafIndex) - ეს poseidon.js-ით და არა poseidon32.js-ით)
   "root": "123 (decimal არის) ", (Merkle tree root, getLastRoot აქვს კონტრაქტს)
   "recipient": "0x1234", (მიმღების public key)
   "relayer": "0x1234", (არ აქვს მნიშვნელობა რას ჩავწერთ)
   "fee": "500000",
   "pathIndices": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   "pathElements": ["123", "234" ...]
   }
6)  გამოტანისას ის მეორე ადამიანი ჩაწერს ამ input.json-ს ჩვენ დეკოდს გავუკეთებთ და withdraw.js-სს გამოვიძახებთ.
    usage: node withdraw.js <account private key (decimal)> <grigali address 0x...> <rpc node> <input.json base64>
