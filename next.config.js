/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Let Node load these directly instead of bundling them with webpack.
    serverComponentsExternalPackages: ['@vercel/blob', 'undici'],
  },
  webpack: (config, { isServer }) => {
    // @vercel/blob depends on undici, which Next 14.1's webpack can't parse.
    // On the server Node provides it at runtime; the browser build uses the
    // package's own browser shim.
    if (isServer) {
      config.externals = [...(config.externals || []), { undici: 'commonjs undici' }];
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
