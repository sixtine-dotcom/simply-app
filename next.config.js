const remotePatterns = [
  {
    protocol: 'https',
    hostname: '*.r2.cloudflarestorage.com',
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
  },
];

if (process.env.R2_PUBLIC_URL) {
  try {
    const r2PublicUrl = new URL(process.env.R2_PUBLIC_URL);
    remotePatterns.push({
      protocol: r2PublicUrl.protocol.replace(':', ''),
      hostname: r2PublicUrl.hostname,
    });
  } catch {
    // Ignore invalid local env values; upload route will still validate config.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Keep packages under node_modules when it points to the local .nosync folder.
    // Next otherwise treats dependencies such as Resend as application source.
    if (require('fs').lstatSync(require('path').join(__dirname, 'node_modules')).isSymbolicLink()) {
      config.resolve.symlinks = false;
    }
    return config;
  },
  // Gebruik lokaal een aparte cache zodat `next build` een draaiende dev-server niet beschadigt.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    const assets = require('./src/lib/static-assets.json');
    return { beforeFiles: [], afterFiles: [], fallback: Object.entries(assets).map(([source, destination]) => ({ source, destination })) };
  },
  images: {
    remotePatterns,
  },
  experimental: {
    // Carousel slides drawn in the app read their fonts from disk (src/lib/carousel-render).
    outputFileTracingIncludes: {
      '/api/admin/carousels/**': ['./src/lib/carousel-render/fonts/**'],
    },
  },
};

module.exports = nextConfig;
