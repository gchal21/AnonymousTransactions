Grigali address with final values: 0x5D562eD3be0307F52be48C71873652C58Efe4112
poseidon hasher address: 0xC0E119Df844868CA90AC978163475001B666d090
zk-snark proof verifier: 0x3f74177fde50cb57fe25ac002088d7a79d748be4

current grigali is working on 0.1 Eth denomination

1) კოტლინის მხარეს დაგენერირდა გრანდიოზული რიცხვი რენდომ რიცხვი
   ეს რიცხვი დაიჰეშა poseidon.js ით 0 ანთან. ეს არის ქომითმენტი.
2)  ამის შემდგომ ვიძახებთ deposit.js-ს
   usage: node deposit.js <account private key (decimal)> <grigali address 0x...> <rpc node> <commitment 0x.. (poseidon.js - ით) და უნდა გადაიქცეს ჰექსად>
3) დაგენერირებული რიცხვი არის nullifier, რომელიც უნდა გამოვუჩინოთ მომხმარებელს. (ამით შეიძლება შემდგომში ფულის გამოტანა)
4) გამოტანაზე დაჭერისას მომხმარებელი ჩაწერს nullifier-ს და ჩვენ ამ nullifier-ით ისევ გავიგებთ commitment-ს
    და ამ ქომითმენტს გავაგზავნით სერვერზე (REST-ით ჩვეულებრივ), სერვერი დაგვიბრუნებს მერკელის path-ს, indices და 
    root-ს. 
5) ამის შემდეგ ავაწყობთ input.json-ს, რომლითაც გამოვიძახებთ withdraw.js-ს
   usage: node withdraw.js <account private key (decimal)> <grigali address 0x...> <rpc node> <input.json base64>
