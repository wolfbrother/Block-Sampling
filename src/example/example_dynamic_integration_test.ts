import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { fromBase64 } = require('@mysten/sui/utils');

import { buildPoseidon } from "circomlibjs";
import { MerkleTree } from "fixed-merkle-tree";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const snarkjs = require('snarkjs');


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const configPath = path.join(ROOT_DIR, 'src/config.json');
const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const PATHS = {
    wasm: path.join(ROOT_DIR, "circuits/build/main_js/main.wasm"),
    zkey: path.join(ROOT_DIR, "circuits/build/circuit_final.zkey"),
    vkey: path.join(ROOT_DIR, "circuits/build/verification_key.json"),
};

const client = new SuiClient({ url: CONFIG.NETWORK_URL });
const keypair = Ed25519Keypair.fromSecretKey(CONFIG.PRIVATE_KEY);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class LocalDatabase {
    tree: any;
    F: any;
    leaves: bigint[] = []; 
    rawValues: string[] = []; 

    async init() {
        const poseidon = await buildPoseidon();
        this.F = poseidon.F;

        for (let i = 1; i <= CONFIG.TOTAL_DATA_COUNT; i++) {
            const rawVal = i.toString();
            this.rawValues.push(rawVal);
            const leafHash = poseidon([BigInt(rawVal)]); 
            this.leaves.push(this.F.toObject(leafHash)); 
        }

        this.tree = new MerkleTree(CONFIG.TREE_DEPTH, this.leaves as any[], { 
            hashFunction: (a, b) => {
                const res = poseidon([BigInt(a), BigInt(b)]);
                return this.F.toObject(res); 
            },
            zeroElement: 0 
        });
        const rootBigInt = this.tree.root;
    }

    getRoot() {
        return this.tree.root.toString();
    }

    generateWitness(index: number) {
        if (index < 0 || index >= CONFIG.TOTAL_DATA_COUNT) throw new Error(`Index out of bounds: ${index}`);
        const rawValue = this.rawValues[index]; 
        const leafHash = this.leaves[index];
        const { pathElements, pathIndices } = this.tree.proof(leafHash);

        return {
            "root": this.getRoot(),
            "rangeMin": 1,
            "rangeMax": CONFIG.TOTAL_DATA_COUNT,
            "challengeIndex": index,
            "value": rawValue,
            "pathElements": pathElements.map((x: any) => x.toString()), 
            "pathIndices": pathIndices 
        };
    }
}

async function signAndExecute(tx: typeof Transaction, description: string) {
    console.log(`\n🔵 Executing: ${description}...`);
    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });
    if (result.effects?.status.status !== 'success') {
        throw new Error(`Transaction Failed: ${result.effects?.status.error}`);
    }
    console.log(`✅ Success! Digest: ${result.digest}`);
    return result;
}

async function runDynamicTest() {
    try {
        const db = new LocalDatabase();
        await db.init();

        const tx1 = new Transaction();
        const descBytes = new TextEncoder().encode("Dynamic Dataset 1-10000");

        tx1.moveCall({
            target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::register_dataset`,
            arguments: [
                tx1.pure.u256(db.getRoot()),
                tx1.pure.u64(1),
                tx1.pure.u64(CONFIG.TOTAL_DATA_COUNT),
                tx1.pure.vector('u8', Array.from(descBytes)),
            ],
        });

        const res1 = await signAndExecute(tx1, "Step 1: Register Dataset");
        const createdListing = res1.objectChanges?.find(
            (ch: any) => ch.type === 'created' && ch.objectType.includes('DataListing')
        ) as any;
        const listingId = createdListing?.objectId;
        console.log(`   📝 Listing Created: ${listingId}`);

        console.log("💤 Waiting 1s for indexing...");

        for (let i = 1; i <= CONFIG.ROUNDS; i++) {
            console.log(`\n\n      --- 🏁 ROUND ${i} / ${CONFIG.ROUNDS} ---`);
            await wait(1000);
            const tx2 = new Transaction();
            tx2.moveCall({
                target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::start_challenge`,
                arguments: [ tx2.object(listingId), tx2.object(CONFIG.RANDOM_STATE_ID) ],
            });

            const res2 = await signAndExecute(tx2, "Step 2: Start Challenge");
            const createdSession = res2.objectChanges?.find(
                (ch: any) => ch.type === 'created' && ch.objectType.includes('ChallengeSession')
            ) as any;
            const sessionId = createdSession?.objectId;

            const event = res2.events?.find((e: any) => e.type.includes("ChallengeStartedEvent"));
            if (!event) throw new Error("ChallengeStartedEvent not found!");
            const seedBytes = (event.parsedJson as any).random_seed;
            const seedHex = seedBytes.map((b: number) => b.toString(16).padStart(2, '0')).join('');
            const seedBigInt = BigInt("0x" + seedHex);
            const challengeIndex = Number(seedBigInt % BigInt(CONFIG.TOTAL_DATA_COUNT));
            
            console.log(`\n🎰 RANDOM DRAW: Index [ ${challengeIndex} ]`);

            console.log("\n⏳ Step 3: Generating & Verifying Witness...");
            const inputJson = db.generateWitness(challengeIndex);
            
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                inputJson,
                PATHS.wasm,
                PATHS.zkey
            );
            console.log("   ✅ Proof Generated.");

            const vKey = JSON.parse(fs.readFileSync(PATHS.vkey, 'utf8'));
            const isValidLocally = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            
            if (!isValidLocally) {
                console.error("❌ CRITICAL ERROR: Local ZKP verification failed!");
                console.error("   Please check your circuit logic or input generation.");
                return; 
            }
            console.log("   🔐 Local Verification PASSED.");

            const tx3 = new Transaction();
            
            tx3.moveCall({
                target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::submit_verification_result`,
                arguments: [
                    tx3.object(sessionId),
                    tx3.object(listingId),
                    tx3.pure.bool(isValidLocally), 
                ],
            });

            const res3 = await signAndExecute(tx3, "Step 4: Submit Result");
            console.log("\n🎉 Dynamic Integration Test Completed Successfully!");
        }

    } catch (e) {
        console.error("\n❌ TEST FAILED:", e);
    }
}

runDynamicTest();