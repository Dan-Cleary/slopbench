import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "child_process";
import models from "../data/models.json";

console.log(`\nSlopBench — running ${models.length} models\n`);

for (const model of models) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Model: ${model}`);
  console.log("=".repeat(50));
  try {
    execSync(`npx tsx scripts/run.ts ${model}`, { stdio: "inherit" });
  } catch {
    console.error(`Failed: ${model} — continuing to next model`);
  }
}

console.log("\nAll done.");
