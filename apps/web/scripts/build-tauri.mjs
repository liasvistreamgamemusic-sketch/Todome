/**
 * Tauri build script — Windows + macOS compatible.
 *
 * Next.js static export (output: 'export') cannot include API routes
 * or dynamic routes without generateStaticParams.
 * This script moves them aside during build, then restores them.
 *
 * _build_bak/ is in .gitignore so it can never be accidentally committed.
 */

import { renameSync, cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';

const BAK_ROOT = 'src/app/_build_bak';

// Directories incompatible with static export (API routes, dynamic routes)
const EXCLUDE_DIRS = [
  'src/app/api',
  'src/app/invite',
];

function moveDir(src, dest) {
  try {
    renameSync(src, dest);
  } catch {
    cpSync(src, dest, { recursive: true });
    rmSync(src, { recursive: true, force: true });
  }
}

// Clean previous backup
if (existsSync(BAK_ROOT)) rmSync(BAK_ROOT, { recursive: true, force: true });

const movedDirs = [];

for (const dir of EXCLUDE_DIRS) {
  if (existsSync(dir)) {
    const bakDest = join(BAK_ROOT, dir);
    mkdirSync(dirname(bakDest), { recursive: true });
    moveDir(dir, bakDest);
    movedDirs.push(dir);
    console.log(`[build-tauri] Moved aside: ${dir}`);
  }
}

try {
  execSync('next build', {
    stdio: 'inherit',
    env: { ...process.env, NEXT_BUILD_TARGET: 'tauri' },
  });
} finally {
  for (const dir of movedDirs) {
    const bakSrc = join(BAK_ROOT, dir);
    if (existsSync(bakSrc)) {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      moveDir(bakSrc, dir);
      console.log(`[build-tauri] Restored: ${dir}`);
    }
  }
  if (existsSync(BAK_ROOT)) rmSync(BAK_ROOT, { recursive: true, force: true });
}
