pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template HashConsistency() {
    signal input value;
    signal output leaf; 

    component hasher = Poseidon(1);
    hasher.inputs[0] <== value;
    
    leaf <== hasher.out;
}