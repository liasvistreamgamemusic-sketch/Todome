import { readFileSync } from 'node:fs';

/** @type {import('next').NextConfig} */
const isTauriBuild = process.env.NEXT_BUILD_TARGET === 'tauri';

const tauriConf = JSON.parse(
  readFileSync(new URL('../desktop/src-tauri/tauri.conf.json', import.meta.url), 'utf-8'),
);

const nextConfig = {
  ...(isTauriBuild
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true, formats: ['image/webp'] },
      }
    : {
        images: { formats: ['image/webp'] },
      }),
  transpilePackages: ['@todome/ui', '@todome/db', '@todome/store', '@todome/hooks'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  env: {
    APP_VERSION: tauriConf.version,
  },
};

export default nextConfig;
