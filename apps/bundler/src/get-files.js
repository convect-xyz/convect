import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.env.SRC_DIR, 'src');
console.log(fs.readdirSync(SRC_DIR).filter(file => file.endsWith(".indexer.ts")).map((file) => path.join(SRC_DIR, file)).join(" "))
