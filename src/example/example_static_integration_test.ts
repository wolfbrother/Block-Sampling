import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

const snarkjs = require('snarkjs');

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const configPath = path.join(ROOT_DIR, 'src/config.json');
const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const PATHS = {
    wasm: path.join(ROOT_DIR, "circuits/build/main_js/main.wasm"),
    zkey: path.join(ROOT_DIR, "circuits/build/circuit_final.zkey"),
    vkey: path.join(ROOT_DIR, "circuits/build/verification_key.json"),
    input: path.join(ROOT_DIR, "circuits/tests/input.json"),
};

const client = new SuiClient({ url: CONFIG.NETWORK_URL });
const keypair = Ed25519Keypair.fromSecretKey(CONFIG.PRIVATE_KEY);

async function signAndExecute(tx: typeof Transaction, description: string) {
    try {
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: {
                showEffects: true,
                showEvents: true,
                showObjectChanges: true
            },
        });
        if (result.effects?.status.status !== 'success') {
            throw new Error(`Transaction Failed: ${result.effects?.status.error}`);
        }
        return result;
    } catch (e) {
        throw e;
    }
}

async function runIntegrationTest() {
    try {
        if (!fs.existsSync(PATHS.input)) throw new Error(`Input file not found at ${PATHS.input}`);
        const inputJson = JSON.parse(fs.readFileSync(PATHS.input, 'utf8'));

        console.log("\n[Step 1] Registering Dataset...");
        const tx1 = new Transaction();
        const descBytes = new TextEncoder().encode("Electricity Consumption Data 2026");
        tx1.moveCall({
            target: `${CONFIG.PACKAGE_ID}::experiment::register_dataset`,
            arguments: [
                tx1.pure.u256(inputJson.root),
                tx1.pure.u64(inputJson.rangeMin),
                tx1.pure.u64(inputJson.rangeMax),
                tx1.pure.vector('u8', Array.from(descBytes)), 
            ],
        });
        const res1 = await signAndExecute(tx1, "Step 1: Register Dataset");
        const createdListing = res1.objectChanges?.find(
            (ch: any) => ch.type === 'created' && ch.objectType.includes('DataListing')
        ) as any;
        const listingId = createdListing?.objectId;
        if (!listingId) throw new Error("Could not find Listing ID in transaction effects");
        console.log(`   📝 Listing Created: ${listingId}`);
        await wait(1000);
    }
}