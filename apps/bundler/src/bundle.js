import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const SRC_DIR = process.env.SRC_DIR;
const OUT_DIR = process.env.OUT_DIR;

function getFiles() {
  return fs.readdirSync(SRC_DIR).filter(file => file.endsWith(".indexer.ts")).map((file) => path.join(SRC_DIR, file));
}

async function main() {
  console.log("bundling...")
  const files = getFiles();

  await esbuild.build({
    entryPoints: files,
    bundle: true,
    outdir: OUT_DIR
  })
}

main()
