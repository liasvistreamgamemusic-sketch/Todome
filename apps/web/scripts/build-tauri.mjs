/**
 * Tauri build script — Windows + macOS compatible.
 *
 * Next.js static export (output: 'export') cannot include API routes.
 * This script moves api/ aside during build, then restores it.
 *
 * _api_bak/ is in .gitignore so it can never be accidentally committed.
 */

import { renameSync, cpSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const API_DIR = 'src/app/api';
const BAK_DIR = 'src/app/_api_bak';

function moveDir(src, dest) {
  try {
    renameSync(src, dest);
  } catch {
    cpSync(src, dest, { recursive: true });
    rmSync(src, { recursive: true, force: true });
  }
}

if (existsSync(API_DIR)) {
  if (existsSync(BAK_DIR)) rmSync(BAK_DIR, { recursive: true, force: true });
  moveDir(API_DIR, BAK_DIR);
  console.log('[build-tauri] API routes moved aside.');
}

try {
  execSync('next build', {
    stdio: 'inherit',
    env: { ...process.env, NEXT_BUILD_TARGET: 'tauri' },
  });
} finally {
  if (existsSync(BAK_DIR)) {
    if (existsSync(API_DIR)) rmSync(API_DIR, { recursive: true, force: true });
    moveDir(BAK_DIR, API_DIR);
    console.log('[build-tauri] API routes restored.');
  }
}
