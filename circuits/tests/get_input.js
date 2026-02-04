const { buildPoseidon } = require("..\\..\\node_modules\\circomlibjs");
const fs = require("fs");

async function generate() {
    const poseidon = await buildPoseidon();
    
    const levels = 20; 
    const value = 42; 
    const challengeIndex = 3; 

    let currentHash = poseidon([BigInt(value)]);

    let pathElements = [];
    let pathIndices = [];
    let tempIndex = challengeIndex;

    for (let i = 0; i < levels; i++) {
        let direction = tempIndex % 2;
        pathIndices.push(direction);

        let sibling = BigInt(0); 
        pathElements.push(sibling.toString());

        if (direction === 0) {
            currentHash = poseidon([currentHash, sibling]);
        } else {
            currentHash = poseidon([sibling, currentHash]);
        }
        tempIndex = Math.floor(tempIndex / 2);
    }

    const inputData = {
        "root": poseidon.F.toString(currentHash),
        "rangeMin": "10",
        "rangeMax": "100",
        "challengeIndex": challengeIndex.toString(),
        "value": value.toString(),
        "pathElements": pathElements,
        "pathIndices": pathIndices
    };

    fs.writeFileSync("input.json", JSON.stringify(inputData, null, 4));
    console.log("Success: input.json has been generated correctly.");
}

generate().catch(console.error);