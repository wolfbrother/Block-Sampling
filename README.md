# Block-Sampling: An Entropy-Driven Probabilistic Zero-Knowledge Verification Framework for Efficient Data Element Trading

This repository contains the official implementation and experimental framework for **Block-Sampling**, a novel privacy-preserving data verification framework designed for high-throughput data element trading. The system addresses the "trust-privacy" paradox by ensuring data is "available but not visible" through the integration of blockchain-native entropy and Zero-Knowledge Proofs (ZKP).

---

## 1. System Overview

The Block-Sampling framework utilizes a **Control-Data Separation Architecture**:

* **Control Plane (On-chain):** Managed by the **Sui Blockchain**, responsible for data commitment (Merkle Roots), generating unpredictable sampling indices via native VRF (Verifiable Random Function), and recording final verification results.


* **Data Plane (Off-chain):** Handles bulk data transmission and computationally intensive ZKP generation/verification.


* **Regulatory Authority (TRI):** An off-chain node that retrieves on-chain entropy to verify sampling proofs asynchronously, bypassing blockchain execution limits.



---

## 2. Repository Structure

The repository is organized to facilitate the reproduction of the performance benchmarks presented in the paper.

```text
Block-Sampling/
├── circuits/           # ZKP Core (Universal Constraint Framework)
│   ├── templates/      # Atomic operator templates (Range, Membership, Hash)
│   ├── build/          # Compiled circuit artifacts (R1CS, WASM, ZKey)
│   └── tests/          # Local circuit unit tests
├── contracts/          # On-chain Control Plane (Sui Move)
│   ├── sources/        # block_sampling.move (Logic core)
│   └── tests/          # Contract functional tests
├── src/                # Implementation & Integration
│   ├── experiments/    # Automated scripts for paper experiments (01-04)
│   └── example/        # Integration test examples
└── results/            # Raw experimental data

```

---

## 3. Core Components

### Universal ZKP Constraint Framework (`/circuits`)

The framework utilizes **Circom 2.0** to implement an atomized arithmetic template library:

* **Hash Consistency (`hash_consistency.circom`):** Anchors raw data to its cryptographic commitment.


* **Merkle Membership (`membership.circom`):** Proves a sampled block belongs to a specific Merkle Root.


* **Range Check (`range_check.circom`):** Validates that data values satisfy specific business rules (e.g., ) without revealing.



### Sui Move Contracts (`/contracts`)

The on-chain component acts as the system's "Entropy Beacon" and "Final Arbiter":

* **Randomness:** Uses the `0x2::random` module to generate 32-byte `random_seed` for unbiased sampling.


* **Commitment:** Stores the `merkle_root` and `range_bounds` as immutable baseline data.


* **Events:** Emits `ChallengeStartedEvent` to trigger off-chain proving and `VerificationPassedEvent` for atomic settlement.



---

## 4. Experimental Validation

The repository includes automated scripts in `src/experiments/` to reproduce the primary findings of the paper:

| Experiment | Script | Goal | Key Result |
| --- | --- | --- | --- |
| **EXP 1: Efficiency** | `01_efficiency.ts` | Compare proving time vs. full-scale ZKP.| <br>**19x improvement** (23s for  records).|
| **EXP 2: Security** | `02_security.ts` | Simulate detection probability .| <br>**>99% detection rate** at 5% sampling.|
| **EXP 3: Latency** | `03_latency.ts` | Measure end-to-end interaction time.| <br>**s** commitment-to-challenge latency.|
| **EXP 4: Versatility** | `04_versatility.ts` | Measure R1CS constraints for templates.| Stable overhead across heterogeneous data types. |

---

## 5. Usage Guide

### Prerequisites

* **Circom & SnarkJS:** For ZKP circuit compilation and proving.
* **Sui CLI:** For smart contract deployment and interaction.
* **Node.js:** For running integration tests and experiment scripts.

### Execution Workflow

1. **Circuit Preparation:** Compile circuits in `/circuits` and perform the Trusted Setup (Phase 1 & Phase 2).
2. **Contract Deployment:** Publish the Move package to Sui Testnet to obtain the `packageID`.
3. **Running Experiments**




