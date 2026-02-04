
$ErrorActionPreference = "Stop"

$BUILD_DIR = "build"
$LOCK_FILE = "$BUILD_DIR\circuit.lock"

function Get-CircuitHash {
    $files = Get-ChildItem -Path . -Recurse -Filter *.circom | Sort-Object FullName
    
    if ($files.Count -eq 0) {
        Write-Error "Error: No .circom files found!"
        exit 1
    }

    $combinedHashContent = ""
    foreach ($file in $files) {
        $fileHash = Get-FileHash -Path $file.FullName -Algorithm SHA256
        $combinedHashContent += $fileHash.Hash
    }

    $finalHash = Create-HashString -InputString $combinedHashContent
    return $finalHash
}

function Create-HashString([string]$InputString) {
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputString)
    $hashBytes = $sha256.ComputeHash($bytes)
    return -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
}

$CurrentHash = Get-CircuitHash

$SkipBuild = $false

if ((Test-Path $BUILD_DIR) -and (Test-Path $LOCK_FILE)) {
    $OldHash = Get-Content -Path $LOCK_FILE
    
    if ($CurrentHash -eq $OldHash) {
        $SkipBuild = $true
    }
} 

if (-not $SkipBuild) {

    if (Test-Path $BUILD_DIR) { Remove-Item $BUILD_DIR -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $BUILD_DIR | Out-Null

    Write-Host "--> Compiling Circuit..."
    circom main.circom --r1cs --wasm --sym --output build
    
    Write-Host "--> Generating Trusted Setup (Phase 1)..."
    
    snarkjs powersoftau new bn128 14 build\pot14_0000.ptau -v
    snarkjs powersoftau contribute build\pot14_0000.ptau build\pot14_final.ptau --name="FirstContribution" -v -e="random text"
    snarkjs powersoftau prepare phase2 build\pot14_final.ptau build\pot14_prepared.ptau -v
    snarkjs groth16 setup build\main.r1cs build\pot14_prepared.ptau build\circuit_final.zkey
    snarkjs zkey export verificationkey build\circuit_final.zkey build\verification_key.json

    Set-Content -Path $LOCK_FILE -Value $CurrentHash
}