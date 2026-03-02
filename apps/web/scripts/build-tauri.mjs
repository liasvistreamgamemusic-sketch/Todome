/**
 * Tauri build script — Windows + macOS compatible.
 *
 * Tauri uses Next.js static export (output: 'export') which cannot include
 * dynamic API routes. This script temporarily moves the API route directory
 * out of the way during the build, then restores it afterward.
 */

import { renameSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const API_DIR = 'src/app/api';
const BAK_DIR = 'src/app/_api_bak';

// Move API routes out of the way
if (existsSync(API_DIR)) {
  renameSync(API_DIR, BAK_DIR);
}

try {
  execSync('cross-env NEXT_BUILD_TARGET=tauri next build', {
    stdio: 'inherit',
    env: { ...process.env, NEXT_BUILD_TARGET: 'tauri' },
  });
} finally {
  // Always restore, regardless of build success/failure
  if (existsSync(BAK_DIR)) {
    renameSync(BAK_DIR, API_DIR);
  }
}
