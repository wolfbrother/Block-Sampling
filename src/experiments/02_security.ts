import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

function runSecuritySimulation() {
    const N = 1000000;
    const fraudRatios = [0.01, 0.03, 0.05, 0.10];
    const sampleSizes = [10, 50, 90, 150, 200];
    const trials = 10000;
    const results = [];

    for (const alpha of fraudRatios) {
        const M = Math.floor(N * alpha);
        for (const K of sampleSizes) {
            let detectedCount = 0;

            for (let t = 0; t < trials; t++) {
                let found = false;
                for (let i = 0; i < K; i++) {
                    const sampledIdx = Math.floor(Math.random() * N);
                    if (sampledIdx < M) {
                        found = true;
                        break;
                    }
                }
                if (found) detectedCount++;
            }

            const empiricalPd = detectedCount / trials;
            const theoreticalPd = 1 - Math.pow(1 - alpha, K);

            results.push({ alpha, K, empiricalPd, theoreticalPd });
        }
    }

    const csvHeader = "FraudRatio(alpha),SampleSize(K),EmpiricalPd,TheoreticalPd\n";
    const csvRows = results.map(r => `${r.alpha},${r.K},${r.empiricalPd.toFixed(4)},${r.theoreticalPd.toFixed(4)}`).join("\n");
    fs.writeFileSync(path.join(ROOT_DIR, 'results/02-security_sim.csv'), csvHeader + csvRows);
}

runSecuritySimulation();