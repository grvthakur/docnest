#!/usr/bin/env node
/**
 * backfill-filesize.js — one-time utility to add "fileSize" (bytes) to
 * every existing variant in the person JSON files, by reading the actual
 * file size from disk. Safe to re-run (just overwrites fileSize with the
 * current on-disk value).
 *
 * Usage:
 *   node backfill-filesize.js [--dry-run]
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DRY_RUN = process.argv.includes("--dry-run");

const JSON_FILES = [
  "mummy-files.json",
  "papa-files.json",
  "gaurav-files.json",
  "anamika-files.json",
];

let totalUpdated = 0;
let totalMissing = 0;

for (const file of JSON_FILES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const docs = JSON.parse(fs.readFileSync(full, "utf8"));
  let changed = false;

  for (const doc of docs) {
    for (const variant of doc.variants || []) {
      const absPath = path.join(ROOT, variant.filePath);
      if (fs.existsSync(absPath)) {
        const size = fs.statSync(absPath).size;
        if (variant.fileSize !== size) {
          variant.fileSize = size;
          changed = true;
          totalUpdated++;
        }
      } else {
        console.warn(`[missing] ${file}: ${variant.filePath}`);
        totalMissing++;
      }
    }
  }

  if (changed && !DRY_RUN) {
    fs.writeFileSync(full, JSON.stringify(docs, null, 2) + "\n", "utf8");
    console.log(`Updated ${file}`);
  } else if (changed) {
    console.log(`Would update ${file} (dry run)`);
  }
}

console.log(
  `\nDone. ${totalUpdated} variant(s) updated${DRY_RUN ? " (dry run, not saved)" : ""}. ${totalMissing} file(s) missing on disk.`,
);
