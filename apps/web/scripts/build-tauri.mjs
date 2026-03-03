/**
 * Tauri build script — Windows + macOS compatible.
 *
 * Tauri uses Next.js static export (output: 'export') which cannot include
 * dynamic API routes. This script temporarily moves the API route directory
 * out of the way during the build, then restores it afterward.
 */

import { renameSync, cpSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const API_DIR = 'src/app/api';
const BAK_DIR = 'src/app/_api_bak';

/** Move directory with fallback for Windows EPERM on renameSync. */
function moveDir(src, dest) {
  try {
    renameSync(src, dest);
  } catch {
    cpSync(src, dest, { recursive: true });
    rmSync(src, { recursive: true, force: true });
  }
}

// Move API routes out of the way
if (existsSync(API_DIR)) {
  if (existsSync(BAK_DIR)) rmSync(BAK_DIR, { recursive: true, force: true });
  moveDir(API_DIR, BAK_DIR);
}

try {
  execSync('cross-env NEXT_BUILD_TARGET=tauri next build', {
    stdio: 'inherit',
    env: { ...process.env, NEXT_BUILD_TARGET: 'tauri' },
  });
} finally {
  // Always restore, regardless of build success/failure
  if (existsSync(BAK_DIR)) {
    if (existsSync(API_DIR)) rmSync(API_DIR, { recursive: true, force: true });
    moveDir(BAK_DIR, API_DIR);
  }
}
