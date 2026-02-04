pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template MerkleMembership(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    signal currentHash[levels + 1];

    currentHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        
        var left = currentHash[i];
        var right = pathElements[i];
        
        hashers[i].inputs[0] <== (right - left) * pathIndices[i] + left;
        hashers[i].inputs[1] <== (left - right) * pathIndices[i] + right;

        currentHash[i + 1] <== hashers[i].out;
    }

    currentHash[levels] === root;
}