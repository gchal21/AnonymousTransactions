deposit/withdraw flow

1) კოტლინის მხარეს დაგენერირდა გრანდიოზული რიცხვი (GUID) ეს რიცხვი დაიჰეშა poseidon32.js ით 0 ანთან. ეს არის ქომითმენტი.

2)  სმარტკონტრაქტიდან ვიძახებთ და ვინახავთ: filledSubtrees, zeros, nextIndex.
    გამოვიძახოთ deposit.js. ეს გვიბრუნებს (ტრანზაქციის ჰეშს leafHash, leafindex-ს და რო შესრულდა) 
usage: node deposit.js <account private key (decimal)> <grigali address 0x...> <rpc node> <commitment 0x.. (poseidon32.js - ით)>  
3) უნდა აეწყოს input.json, რომელიც გამოიყურება შემდეგნაირად:

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
    pathElements და PathIndices ვიგებთ getPathElements.js-ით (გასაკეთებელია, ამ წუთას ჯავაში გვაქვს თითქმის მზად) ამას 
    სჭირდება შემდეგი არგუმენტები getFilledSubtrees, რომელიც სმარტკონტრაქტის ფუნქციაა (UNDA GAMOVIDZAXOT DEPOSITIS GAKETEBAMDE)
    getZeros (UNDA GAMOVIDZAXOT DEPOSITIS GAKETEBAMDE), currentIndex (რომელიც რეალურად სმარტკოტრაქტში რომ nextIndex არის ეგაა და
    ესეც UNDA GAMOVIDZAXOT DEPOSITIS GAKETEBAMDE), commitment. pathElements უნდა დაბრუნდეს დეციმალებად და არა ჰექსად.
4) გადამრიცხავს უნდა გამოვუჩინოთ ეს input.json base64-ით ენკოდირებული, რომ ერთი დიდი სტრინგი იყოს.
    
5) გამოტანისას ის მეორე ადამიანი ჩაწერს ამ input.json-ს ჩვენ დეკოდს გავუკეთებთ და withdraw.js-სს გამოვიძახებთ.
    usage: node withdraw.js <account private key (decimal)> <grigali address 0x...> <rpc node> <input.json base64> (TODO: ეს ასეა გადასაკეთებელი)
