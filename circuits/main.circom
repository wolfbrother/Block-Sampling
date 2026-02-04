pragma circom 2.0.0;

include "templates/range_check.circom";
include "templates/membership.circom";
include "templates/hash_consistency.circom";


template Main(levels, nBits) {

    signal input root;

    signal input rangeMin;
    signal input rangeMax;

    signal input challengeIndex;

    signal input value;   
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component consistency = HashConsistency();
    consistency.value <== value;

    component membership = MerkleMembership(levels);
    membership.leaf <== consistency.leaf;
    membership.root <== root;
    for (var i = 0; i < levels; i++) {
        membership.pathElements[i] <== pathElements[i];
        membership.pathIndices[i] <== pathIndices[i];
    }

    var indexSum = 0;
    for (var i = 0; i < levels; i++) {
        indexSum += pathIndices[i] * (1 << i);
    }

    indexSum === challengeIndex;

    component range = RangeCheck(nBits);
    range.value <== value;
    range.min <== rangeMin;
    range.max <== rangeMax;
}

component main {public [root, rangeMin, rangeMax, challengeIndex]} = Main(20, 64);