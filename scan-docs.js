#!/usr/bin/env node
/**
 * scan-docs.js — detect new files in files/<person>/... and append
 * entries to <person>-files.json. Idempotent, dry-run capable.
 *
 * Usage:
 *   node scan-docs.js [--dry-run] [--verbose] [--person=gaurav]
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const FILES_DIR = path.join(ROOT, "files");

const PERSONS = {
  mummy: { type: "flat", jsonFile: "mummy-files.json" },
  papa: { type: "flat", jsonFile: "papa-files.json" },
  gaurav: { type: "nested", jsonFile: "gaurav-files.json" },
  anamika: { type: "nested", jsonFile: "anamika-files.json" },
};

const EXT_MAP = {
  ".pdf": "pdf",
  ".jpg": "jpg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".webp": "webp",
  ".doc": "doc",
  ".docx": "docx",
  ".xls": "xls",
  ".xlsx": "xlsx",
  ".txt": "txt",
  ".zip": "zip",
  ".heic": "heic",
};

// ---- CLI args ----
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");
const personArg = args.find((a) => a.startsWith("--person="));
const ONLY_PERSON = personArg ? personArg.split("=")[1] : null;

function log(...a) {
  if (VERBOSE) console.log(...a);
}

function titleCase(str) {
  return str
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function detectImageLabel(filenameNoExt, index, total) {
  const lower = filenameNoExt.toLowerCase();
  if (/\bfront\b/.test(lower)) return "Photo (Front)";
  if (/\bback\b/.test(lower)) return "Photo (Back)";
  if (total === 1) return "Photo";
  return `Photo (${index + 1})`;
}

function labelForVariant(fileType, filenameNoExt, imgIndex, imgTotal) {
  const t = fileType.toLowerCase();
  if (t === "pdf") return "PDF";
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(t))
    return detectImageLabel(filenameNoExt, imgIndex, imgTotal);
  if (["doc", "docx"].includes(t)) return "Word";
  if (["xls", "xlsx"].includes(t)) return "Excel";
  if (t === "txt") return "Text";
  if (t === "zip") return "ZIP";
  return t.toUpperCase();
}

// Recursively walk a directory, returning { relDir: [absFilePaths] } for
// nested persons, or a flat list for flat persons.
function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function loadJson(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return [];
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function saveJson(file, data) {
  const full = path.join(ROOT, file);
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function existingFilePaths(docs) {
  const set = new Set();
  for (const doc of docs) {
    for (const v of doc.variants || []) {
      set.add(v.filePath.replace(/\\/g, "/"));
    }
  }
  return set;
}

function toRelFilePath(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, "/");
}

// Groups a list of absolute file paths (within one category folder) by
// "base name" (filename without extension, with front/back suffix stripped
// for grouping key so e.g. "Card Front.jpg" and "Card Back.jpg" merge, but
// keep enough to also merge plain "Card.pdf" + "Card.jpg").
function groupKey(filenameNoExt) {
  return filenameNoExt
    .replace(/\s*\b(front|back)\b\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function processPerson(personId, cfg, allExisting) {
  const personDir = path.join(FILES_DIR, personId);
  const allFiles = walk(personDir).filter(
    (f) => path.extname(f).toLowerCase() in EXT_MAP,
  );
  log(`\n[${personId}] found ${allFiles.length} files on disk`);

  const existingDocs = loadJson(cfg.jsonFile);
  const existingPaths = existingFilePaths(existingDocs);

  const newFiles = allFiles.filter((f) => !existingPaths.has(toRelFilePath(f)));
  log(`[${personId}] ${newFiles.length} new files not yet in JSON`);

  if (newFiles.length === 0) return { added: 0 };

  // Group new files by (category folder, groupKey)
  const groups = new Map(); // key -> { category, folderPath, files: [absPath] }

  for (const absPath of newFiles) {
    const relToPerson = path.relative(personDir, absPath); // e.g. "Identity/Aadhaar Card.pdf"
    const parts = relToPerson.split(path.sep);
    const filename = parts[parts.length - 1];
    const filenameNoExt = filename.slice(
      0,
      filename.length - path.extname(filename).length,
    );

    let category, folderPath, subDirParts;
    if (cfg.type === "flat") {
      category = "Documents";
      folderPath = personId;
      subDirParts = [];
    } else {
      subDirParts = parts.slice(0, -1); // subfolder path components
      category =
        subDirParts.length > 0
          ? subDirParts[subDirParts.length - 1]
          : "Documents";
      folderPath =
        subDirParts.length > 0
          ? `${personId}/${subDirParts.join("/")}`
          : personId;
    }

    const gKey = `${folderPath}::${groupKey(filenameNoExt)}`;
    if (!groups.has(gKey)) {
      groups.set(gKey, {
        category,
        folderPath,
        name: titleCase(groupKey(filenameNoExt) || filenameNoExt),
        files: [],
      });
    }
    groups.get(gKey).files.push({ absPath, filenameNoExt, filename });
  }

  const newEntries = [];
  for (const [, group] of groups) {
    // Separate images vs others for label numbering
    const imageFiles = group.files.filter((f) => {
      const ext = path.extname(f.filename).toLowerCase();
      return ["jpg", "jpeg", "png", "webp", "heic"].includes(EXT_MAP[ext]);
    });

    const variants = [];
    let imgIndex = 0;
    for (const f of group.files) {
      const ext = path.extname(f.filename).toLowerCase();
      const fileType = EXT_MAP[ext];
      const isImage = ["jpg", "jpeg", "png", "webp", "heic"].includes(fileType);
      const label = labelForVariant(
        fileType,
        f.filenameNoExt,
        isImage ? imgIndex : 0,
        imageFiles.length,
      );
      if (isImage) imgIndex++;
      let fileSize;
      try {
        fileSize = fs.statSync(f.absPath).size;
      } catch (e) {
        fileSize = undefined;
      }
      variants.push({
        label,
        fileType,
        filePath: toRelFilePath(f.absPath),
        ...(fileSize !== undefined ? { fileSize } : {}),
      });
    }

    const tags = Array.from(new Set([group.category.toLowerCase(), personId]));

    const entry = {
      id: `auto-${Date.now()}-${Math.floor(Math.random() * 1000)}-${personId}`,
      name: group.name || "Untitled",
      person: personId,
      category: group.category,
      folderPath: group.folderPath,
      tags,
      lastUpdated: new Date().toISOString().slice(0, 10),
      variants,
    };
    newEntries.push(entry);
    log(
      `[${personId}] + "${entry.name}" (${entry.category}) — ${variants.length} variant(s)`,
    );
  }

  if (!DRY_RUN) {
    const updated = existingDocs.concat(newEntries);
    saveJson(cfg.jsonFile, updated);
  }

  return { added: newEntries.length, entries: newEntries };
}

function main() {
  console.log(
    `DocNest scan — ${DRY_RUN ? "DRY RUN (no files will be written)" : "LIVE"}`,
  );
  let totalAdded = 0;
  for (const [personId, cfg] of Object.entries(PERSONS)) {
    if (ONLY_PERSON && ONLY_PERSON !== personId) continue;
    const result = processPerson(personId, cfg);
    totalAdded += result.added;
    console.log(
      `${personId}: ${result.added} new document${result.added === 1 ? "" : "s"}${DRY_RUN && result.added ? " (not saved — dry run)" : ""}`,
    );
  }
  console.log(`\nDone. ${totalAdded} total new document(s).`);
}

main();
