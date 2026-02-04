import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SuiClient } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

import { buildPoseidon } from "circomlibjs";
import { MerkleTree } from "fixed-merkle-tree";
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const snarkjs = require('snarkjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/config.json'), 'utf-8'));

const PATHS = {
    wasm: path.join(ROOT_DIR, "circuits/build/main_js/main.wasm"),
    zkey: path.join(ROOT_DIR, "circuits/build/circuit_final.zkey"),
};

const client = new SuiClient({ url: CONFIG.NETWORK_URL });
const keypair = Ed25519Keypair.fromSecretKey(CONFIG.PRIVATE_KEY);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const stdDev = (arr: number[]) => {
    if (arr.length <= 1) return 0;
    const mu = mean(arr);
    return Math.sqrt(arr.map(x => Math.pow(x - mu, 2)).reduce((a, b) => a + b, 0) / arr.length);
};

async function runLatencyExperiment() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const dataScales = [1000, 10000, 100000, 1000000];
    const rounds = 5;
    const results = [];

    for (const N of dataScales) {
        const stageTimes = { commitment: [], challenge: [], proving: [], settlement: [] };

        const leaves = Array.from({ length: N }, (_, i) => F.toObject(poseidon([BigInt(i)])));
        const tree = new MerkleTree(CONFIG.TREE_DEPTH, leaves, {
            hashFunction: (a, b) => F.toObject(poseidon([BigInt(a), BigInt(b)])),
            zeroElement: 0
        });

        let listingId = "";

        try {
            const t0 = performance.now();
            const tx1 = new Transaction();
            tx1.moveCall({
                target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::register_dataset`,
                arguments: [
                    tx1.pure.u256(tree.root.toString()), 
                    tx1.pure.u64(0), 
                    tx1.pure.u64(N), 
                    tx1.pure.vector('u8', Array.from(new TextEncoder().encode(`LatTest_Scale_${N}`)))
                ],
            });
            const res1 = await client.signAndExecuteTransaction({ transaction: tx1, signer: keypair, options: { showEffects: true, showObjectChanges: true } });
            await client.waitForTransaction({ digest: res1.digest });
            stageTimes.commitment.push((performance.now() - t0) / 1000);
            listingId = (res1.objectChanges?.find((ch: any) => ch.type === 'created' && ch.objectType.includes('DataListing')) as any).objectId;
            await wait(3000);
        } catch (e) {
            continue;
        }

        for (let r = 1; r <= rounds; r++) {
            try {
                const t1 = performance.now();
                const tx2 = new Transaction();
                tx2.moveCall({ 
                    target: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::start_challenge`, 
                    arguments: [tx2.object(listingId), tx2.object(CONFIG.RANDOM_STATE_ID)] 
                });
                const res2 = await client.signAndExecuteTransaction({ transaction: tx2, signer: keypair, options: { showEvents: true, showObjectChanges: true } });
                await client.waitForTransaction({ digest: res2.digest });
            } catch (e) {
                continue;
            }
        }
    }
}

runLatencyExperiment();