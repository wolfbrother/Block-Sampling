#!/bin/bash

set -e

BUILD_DIR="build"
LOCK_FILE="$BUILD_DIR/circuit.lock"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m' 

get_circuit_hash() {
    find . -name "*.circom" -type f | sort | xargs sha256sum | sha256sum | awk '{print $1}'
}


echo -e "${CYAN}Checking circuit source code changes...${NC}"

CURRENT_HASH=$(get_circuit_hash)

SKIP_BUILD=false

if [ -d "$BUILD_DIR" ] && [ -f "$LOCK_FILE" ]; then
    OLD_HASH=$(cat "$LOCK_FILE")
    
    if [ "$CURRENT_HASH" == "$OLD_HASH" ]; then
        SKIP_BUILD=true
        echo -e "${GREEN}==========================================================${NC}"
        echo -e "${GREEN} [SKIP] 代码未发生变化，复用现有构建产物。${NC}"
        echo -e "${GRAY} 指纹: $CURRENT_HASH${NC}"
        echo -e "${GREEN}==========================================================${NC}"
    else
        echo -e "${YELLOW} [DETECT] 代码已修改，准备重新编译...${NC}"
        echo -e "${GRAY} 旧指纹: $OLD_HASH${NC}"
        echo -e "${GRAY} 新指纹: $CURRENT_HASH${NC}"
    fi
else
    echo -e "${CYAN} [INIT] 首次构建或构建目录丢失，开始编译...${NC}"
fi

if [ "$SKIP_BUILD" = false ]; then

    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    echo "--> Compiling Circuit..."
    circom main.circom --r1cs --wasm --sym --output "$BUILD_DIR"
    
    echo "--> Generating Trusted Setup (Phase 1)..."
    
    snarkjs powersoftau new bn128 14 "$BUILD_DIR/pot14_0000.ptau" -v
    snarkjs powersoftau contribute "$BUILD_DIR/pot14_0000.ptau" "$BUILD_DIR/pot14_final.ptau" --name="FirstContribution" -v -e="random text"
    
    echo "--> Preparing Phase 2..."
    snarkjs powersoftau prepare phase2 "$BUILD_DIR/pot14_final.ptau" "$BUILD_DIR/pot14_prepared.ptau" -v
    
    echo "--> Generating Keys (Phase 2)..."
    snarkjs groth16 setup "$BUILD_DIR/main.r1cs" "$BUILD_DIR/pot14_prepared.ptau" "$BUILD_DIR/circuit_final.zkey"
    
    echo "--> Exporting Verification Key..."
    snarkjs zkey export verificationkey "$BUILD_DIR/circuit_final.zkey" "$BUILD_DIR/verification_key.json"

    echo "$CURRENT_HASH" > "$LOCK_FILE"

fi