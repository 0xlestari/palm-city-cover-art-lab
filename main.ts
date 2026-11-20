// PALM CITY — Cover Art Lab: entry plumbing.
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes dossier.json with the kit's dossier builder.
// Node 22, standard library only. Deterministic: no timestamps, no
// randomness, no network — two runs write the same bytes.

import { buildDossier } from "./vendor/makefun-app.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot: string = path.dirname(fileURLToPath(import.meta.url));
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR || "/output";

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyTree(source: string, target: string): void {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from: string = path.join(source, entry.name);
    const to: string = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

fs.mkdirSync(outputDir, { recursive: true });

const appOut: string = path.join(outputDir, "app");
copyTree(path.join(repoRoot, "app"), appOut);

const shotsOut: string = path.join(outputDir, "screenshots");
const shotsIn: string = path.join(repoRoot, "screenshots");
if (fs.existsSync(shotsIn)) {
  copyTree(shotsIn, shotsOut);
} else {
  // No screenshots yet: hand in an empty screenshots/ directory so the
  // dossier builder always gets a directory that exists.
  fs.mkdirSync(shotsOut, { recursive: true });
}

const dossier: Uint8Array = buildDossier(outputDir, caps);
fs.writeFileSync(path.join(outputDir, "dossier.json"), dossier);
