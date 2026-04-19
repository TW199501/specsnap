#!/usr/bin/env node
// Check that all git-tracked text files use LF line endings.
// Exits 1 if any CRLF is found. Uses execFileSync to avoid shell interpolation.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const BINARY_EXT = /\.(png|jpe?g|gif|ico|woff2?|ttf|eot|pdf|zip|mp[34]|webm)$/i;

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
   .trim()
   .split('\n')
   .filter((f) => f && !BINARY_EXT.test(f));

const offenders = [];
for (const file of tracked) {
   try {
      if (!statSync(file).isFile()) continue;
      const buf = readFileSync(file);
      if (buf.includes(0x0d)) offenders.push(file);
   }
   catch {
      // skip unreadable
   }
}

if (offenders.length > 0) {
   console.error(`CRLF detected in ${offenders.length} file(s):`);
   for (const f of offenders) console.error(`  - ${f}`);
   console.error('\nFix: run `git add --renormalize .` after .gitattributes is in place.');
   process.exit(1);
}

console.log(`All ${tracked.length} tracked text files use LF.`);
