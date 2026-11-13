// Usage: node scripts/validate.ts path/to/app-spec.json
import { readFileSync } from "node:fs";
import { validateSpec } from "./spec.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate.ts path/to/app-spec.json");
  process.exit(2);
}

const problems = validateSpec(JSON.parse(readFileSync(file, "utf8")));
if (problems.length === 0) {
  console.log(`${file}: valid app spec (version 0.1)`);
} else {
  console.error(`${file}: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p.path}: ${p.message}`);
  process.exit(1);
}
