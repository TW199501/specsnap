# SpecSnap Core MVP — Implementation Plan (Part 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the SpecSnap monorepo with LF enforcement, MIT license, pnpm workspace, and the core package skeleton with TypeScript types for Frame/Session/BoxModel. Part 2 adds capture, serializers, playground smoke test, and npm publish.

**Architecture:** pnpm monorepo. Core package is pure TypeScript, zero runtime dependencies. ESM + CJS + `.d.ts` dual output via `tsup`. Uses `vitest` + `happy-dom` for tests.

**Tech Stack:** TypeScript strict · tsup · vitest · happy-dom · pnpm 9+ · Node 20+

**Scope for Part 1 (THIS doc):** Phases 1-2 — repo, LF, workspace, core package scaffolding, domain types. After Part 1, `pnpm install && pnpm --filter @tw199501/specsnap-core build` succeeds and `dist/index.d.ts` exports Frame/Session types.

**Part 2 covers:** capture engine, bilingual lexicon, serializers, playground, npm publish.

---

## File Structure Overview (Part 1 scope)

```
specsnap/
├── .gitignore                   [Task 1]
├── LICENSE                      [Task 1] MIT
├── README.md                    [Task 1]
├── .gitattributes               [Task 2] LF layer 1
├── .editorconfig                [Task 2] LF layer 2
├── .vscode/
│   └── settings.json            [Task 2] LF layer 3
├── scripts/
│   └── check-line-endings.mjs   [Task 2] LF layer 4 (CI guard)
├── package.json                 [Task 3] workspace root
├── pnpm-workspace.yaml          [Task 3]
├── tsconfig.base.json           [Task 3]
└── packages/
    └── core/
        ├── package.json         [Task 4]
        ├── tsconfig.json        [Task 4]
        ├── tsup.config.ts       [Task 4]
        └── src/
            ├── index.ts         [Task 5] public API
            └── types.ts         [Task 5] Frame, Session, BoxModel
```

---

## Phase 1 — Project Bootstrap

### Task 1: Initialize git repo + root files

**Files:**
- Create: `E:\source\specsnap\.gitignore`
- Create: `E:\source\specsnap\LICENSE`
- Create: `E:\source\specsnap\README.md`

- [ ] **Step 1: Init git in project root**

```bash
cd /e/source/specsnap
git init
git branch -M main
```

Expected: `Initialized empty Git repository in .../specsnap/.git/`

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
dist/
coverage/
.DS_Store
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
*.log
.turbo/
.pnpm-store/
```

- [ ] **Step 3: Write `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 tw199501

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Write `README.md`**

```markdown
# SpecSnap

> A zero-loss translator between "human inspects UI visually" and "AI modifies UI precisely"
> 讓人眼觀察 UI 和 AI 修改 UI 之間翻譯損耗歸零的檢視器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Status

🚧 Pre-alpha (v0.0.x) — schema may change. Locking in at v1.0.

## Packages

| Package | Status |
|---------|--------|
| `@tw199501/specsnap-core` | 🚧 in progress |
| `specsnap-extension` | 📋 planned |

## License

[MIT](./LICENSE) © tw199501
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore LICENSE README.md
git commit -m "chore: initialize repo with MIT license and README"
```

---

### Task 2: LF line-ending enforcement (4 layers)

**Files:**
- Create: `E:\source\specsnap\.gitattributes`
- Create: `E:\source\specsnap\.editorconfig`
- Create: `E:\source\specsnap\.vscode\settings.json`
- Create: `E:\source\specsnap\scripts\check-line-endings.mjs`

- [ ] **Step 1: Write `.gitattributes`** (Layer 1 — git source of truth)

```
* text=auto eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.woff binary
*.woff2 binary
*.ttf binary
```

- [ ] **Step 2: Write `.editorconfig`** (Layer 2 — editor baseline)

```ini
root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 3: Write `.vscode/settings.json`** (Layer 3 — VS Code per-project)

```json
{
  "files.eol": "\n",
  "files.encoding": "utf8",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

- [ ] **Step 4: Write `scripts/check-line-endings.mjs`** (Layer 4 — CI guard)

```js
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
```

- [ ] **Step 5: Run the checker**

```bash
node scripts/check-line-endings.mjs
```

Expected: `All N tracked text files use LF.`

If any offenders reported:

```bash
git add --renormalize .
node scripts/check-line-endings.mjs
```

- [ ] **Step 6: Commit**

```bash
git add .gitattributes .editorconfig .vscode/settings.json scripts/check-line-endings.mjs
git commit -m "chore: enforce LF line endings via 4-layer mechanism"
```

---

### Task 3: pnpm monorepo root setup

**Files:**
- Create: `E:\source\specsnap\package.json`
- Create: `E:\source\specsnap\pnpm-workspace.yaml`
- Create: `E:\source\specsnap\tsconfig.base.json`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "specsnap-workspace",
  "version": "0.0.0",
  "private": true,
  "description": "SpecSnap monorepo root",
  "license": "MIT",
  "author": "tw199501",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "check:eol": "node scripts/check-line-endings.mjs",
    "check": "pnpm check:eol && pnpm -r check"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 3: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Install root devDependencies**

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` generated, TypeScript installed.

- [ ] **Step 5: Verify EOL + commit**

```bash
node scripts/check-line-endings.mjs
git add package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: configure pnpm workspace with shared tsconfig base"
```

---

## Phase 2 — Core Package Foundation

### Task 4: Core package scaffolding

**Files:**
- Create: `E:\source\specsnap\packages\core\package.json`
- Create: `E:\source\specsnap\packages\core\tsconfig.json`
- Create: `E:\source\specsnap\packages\core\tsup.config.ts`
- Create: `E:\source\specsnap\packages\core\src\index.ts` (placeholder)

- [ ] **Step 1: Write `packages/core/package.json`**

```json
{
  "name": "@tw199501/specsnap-core",
  "version": "0.0.1",
  "description": "Core capture and serialization library for SpecSnap — the AI-friendly DOM inspector",
  "license": "MIT",
  "author": "tw199501",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tw199501/specsnap.git",
    "directory": "packages/core"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "tsc --noEmit"
  },
  "keywords": ["inspector", "dom", "ai", "llm", "devtools", "bilingual"],
  "devDependencies": {
    "@types/node": "^22.10.0",
    "happy-dom": "^15.11.0",
    "tsup": "^8.3.5",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Write `packages/core/tsup.config.ts`**

Note: `outExtension` is required because `package.json` has `"type": "module"` — without it, tsup emits `.js` for the ESM build and the `"module"` / `exports.import` paths that point to `.mjs` would 404.

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2022',
  outDir: 'dist',
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  }
});
```

- [ ] **Step 4: Write placeholder `packages/core/src/index.ts`**

```ts
export const VERSION = '0.0.1';
```

- [ ] **Step 5: Install + smoke build**

```bash
pnpm install
pnpm --filter @tw199501/specsnap-core build
ls packages/core/dist/
```

Expected files: `index.mjs`, `index.cjs`, `index.d.ts`, plus `.map` files.

- [ ] **Step 6: Commit**

```bash
git add packages/core/ pnpm-lock.yaml
git commit -m "feat(core): scaffold @tw199501/specsnap-core package with tsup build"
```

---

### Task 5: Core domain types

**Files:**
- Create: `E:\source\specsnap\packages\core\src\types.ts`
- Modify: `E:\source\specsnap\packages\core\src\index.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
/**
 * SCHEMA VERSION — bump on any breaking change to exported types.
 * Consumers check Session.schemaVersion for compatibility.
 */
export const SCHEMA_VERSION = '0.0.1';

/** Absolute pixel rectangle relative to the document (not the viewport). */
export interface Rect {
   x: number;
   y: number;
   width: number;
   height: number;
}

/** Four-side numeric tuple: top, right, bottom, left. */
export type FourSides = readonly [number, number, number, number];

/** CSS box model values in pixels. */
export interface BoxModel {
   content: { width: number; height: number };
   padding: FourSides;
   border: FourSides;
   margin: FourSides;
}

export interface Typography {
   fontFamily: string;
   fontSize: number;
   fontWeight: string;
   lineHeight: string;
   letterSpacing: string;
   color: string;
   textAlign: string;
}

export interface Background {
   color: string;
   image: string;
   borderRadius: FourSides;
}

/** Viewport snapshot — MUST appear on every Session. P1 of the design. */
export interface Viewport {
   width: number;
   height: number;
   devicePixelRatio: number;
}

export interface ScrollPosition {
   x: number;
   y: number;
}

export interface ElementIdentity {
   tagName: string;
   id: string | null;
   classList: readonly string[];
   /** Best-effort semantic name, e.g. 'Button[text="Save"]' or 'input#port'. */
   name: string;
   /** CSS selector path that uniquely locates the element. */
   domPath: string;
}

/** A single captured frame — one inspected element. */
export interface Frame {
   index: number;
   identity: ElementIdentity;
   rect: Rect;
   viewportRelative: { xPct: number; yPct: number };
   boxModel: BoxModel;
   typography: Typography;
   background: Background;
}

/** Session envelope — wraps 1..N frames with shared viewport context. */
export interface Session {
   schemaVersion: typeof SCHEMA_VERSION;
   id: string;
   capturedAt: string;
   url: string;
   pageTitle: string;
   viewport: Viewport;
   scroll: ScrollPosition;
   frames: Frame[];
}

export interface SerializeOptions {
   /** Override the bilingual lexicon with extra or replacement entries. */
   lexiconOverride?: Readonly<Record<string, string>>;
   /** If true, JSON output is pretty-printed. Default: true. */
   pretty?: boolean;
}
```

- [ ] **Step 2: Update `src/index.ts` to re-export**

```ts
export const VERSION = '0.0.1';

export {
   SCHEMA_VERSION,
   type Background,
   type BoxModel,
   type ElementIdentity,
   type FourSides,
   type Frame,
   type Rect,
   type ScrollPosition,
   type SerializeOptions,
   type Session,
   type Typography,
   type Viewport
} from './types.js';
```

- [ ] **Step 3: Type-check + build**

```bash
pnpm --filter @tw199501/specsnap-core check
pnpm --filter @tw199501/specsnap-core build
```

Both must pass zero errors.

- [ ] **Step 4: Inspect emitted `.d.ts`**

```bash
cat packages/core/dist/index.d.ts | head -40
```

Expected: re-exports visible, including `SCHEMA_VERSION`, `Frame`, `Session`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/
git commit -m "feat(core): define Frame, Session, BoxModel and related types"
```

---

## End of Part 1

After completing all Tasks 1-5, the state is:

- ✅ git repo initialized with MIT license and README
- ✅ LF enforcement live (4 layers)
- ✅ pnpm workspace configured
- ✅ `@tw199501/specsnap-core` scaffolded
- ✅ Domain types (Frame, Session, BoxModel, Typography, Background, ViewportETC) declared
- ✅ `pnpm --filter @tw199501/specsnap-core build` produces valid ESM + CJS + .d.ts
- ✅ 5 git commits; zero tests yet (tests start in Part 2)

**Next:** proceed to `2026-04-19-mvp-core-plan-part-2.md` for capture engine, bilingual lexicon, serializers, playground smoke test, and npm publish.
