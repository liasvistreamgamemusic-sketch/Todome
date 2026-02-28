/** @type {import('next').NextConfig} */
const isTauriBuild = process.env.NEXT_BUILD_TARGET === 'tauri';

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
};

export default nextConfig;
