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
  // Gebruik lokaal een aparte cache zodat `next build` een draaiende dev-server niet beschadigt.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns,
  },
};

module.exports = nextConfig;
