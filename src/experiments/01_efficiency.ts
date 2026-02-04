import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
const snarkjs = require('snarkjs');
import { buildPoseidon } from "circomlibjs";
import { MerkleTree } from "fixed-merkle-tree";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/config.json'), 'utf-8'));

const PATHS = {
    wasm: path.join(ROOT_DIR, "circuits/build/main_js/main.wasm"),
    zkey: path.join(ROOT_DIR, "circuits/build/circuit_final.zkey"),
};

async function runEfficiencyExperiment() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const samplingRate = 0.05;
    const datasetSizes = [1000, 10000, 100000, 1000000];
    const results = [];

    for (const N of datasetSizes) {
        const startTree = performance.now();
        const leaves = Array.from({ length: N }, (_, i) => F.toObject(poseidon([BigInt(i)])));
        const tree = new MerkleTree(CONFIG.TREE_DEPTH, leaves, {
            hashFunction: (a, b) => F.toObject(poseidon([BigInt(a), BigInt(b)])),
            zeroElement: 0
        });
        const endTree = performance.now();
        const treeBuildTime = (endTree - startTree) / 1000;

        const K = Math.max(1, Math.floor(N * samplingRate));

        const index = Math.floor(Math.random() * N);
        const { pathElements, pathIndices } = tree.proof(leaves[index]);
        const input = {
            "root": tree.root.toString(),
            "rangeMin": 0, "rangeMax": N,
            "challengeIndex": index, "value": index.toString(),
            "pathElements": pathElements.map((x: any) => x.toString()),
            "pathIndices": pathIndices
        };

        const startSingle = performance.now();
        await snarkjs.groth16.fullProve(input, PATHS.wasm, PATHS.zkey);
        const endSingle = performance.now();
        const singleProveTime = (endSingle - startSingle) / 1000;

        const totalBlockSamplingTime = singleProveTime * K;
        const totalFullZKTime = singleProveTime * N; 

        results.push({
            N, K, 
            treeBuildTime: treeBuildTime.toFixed(2),
            singleProveTime: singleProveTime.toFixed(2),
            blockSamplingTime: totalBlockSamplingTime.toFixed(2),
            fullZKTime: totalFullZKTime.toFixed(2),
            speedup: (totalFullZKTime / totalBlockSamplingTime).toFixed(1)
        });
    }

    const csvContent = "N,K,TreeBuild(s),SingleProve(s),BlockSamplingTotal(s),FullZKTotal(s),Speedup\n" +
        results.map(r => `${r.N},${r.K},${r.treeBuildTime},${r.singleProveTime},${r.blockSamplingTime},${r.fullZKTime},${r.speedup}`).join("\n");
    fs.writeFileSync(path.join(ROOT_DIR, 'results/01-efficiency_log.csv'), csvContent);
}

runEfficiencyExperiment();