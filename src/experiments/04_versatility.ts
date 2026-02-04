import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const snarkjs = require('snarkjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const OPERATORS = [
    { 
        name: "Range Check", 
        r1csFile: "test_range.r1cs", 
        template: "range_check.circom",
    },
    { 
        name: "Membership", 
        r1csFile: "test_membership.r1cs", 
        template: "membership.circom",
    },
    { 
        name: "Hash Consistency", 
        r1csFile: "test_consistency.r1cs", 
        template: "hash_consistency.circom",
    }
];

async function runVersatilityExperiment() {
    const results = [];

    for (const op of OPERATORS) {
        const r1csPath = path.join(ROOT_DIR, "circuits", op.r1csFile);
        if (!fs.existsSync(r1csPath)) {
            continue;
        }

        try {
            const r1csInfo = await snarkjs.r1cs.info(r1csPath);
            const realConstraints = r1csInfo.nConstraints;

            results.push({
                Operator: op.name,
                Template: op.template,
                Constraints: realConstraints,
            });
        } catch (err) {
            continue;
        }
    }

    const csvHeader = "Operator,Template,Constraints\n";
    const csvRows = results.map(r => 
        `${r.Operator},${r.Template},${r.Constraints}`
    ).join("\n");
    const outputPath = path.join(ROOT_DIR, 'results/04_versatility.csv');
    fs.writeFileSync(outputPath, csvHeader + csvRows);
}

runVersatilityExperiment();