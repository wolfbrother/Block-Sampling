pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";

template RangeCheck(nBits) {
    signal input value;
    signal input min;
    signal input max;

    component ge = GreaterEqThan(nBits);
    ge.in[0] <== value;
    ge.in[1] <== min;
    ge.out === 1;

    component le = LessEqThan(nBits);
    le.in[0] <== value;
    le.in[1] <== max;
    le.out === 1;
}