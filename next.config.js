/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  swcMinify: true,
  experimental: {
    esmExternals: true
  },
  webpack: (config, { isServer }) => {
    // Handle ES modules
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true
    };

    // Handle WebAssembly
    config.experiments.asyncWebAssembly = true;

    // Handle worker files
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/'
        }
      }
    });

    // Handle canvas and WebGL for drawing
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      };
    }

    return config;
  },
  
  // Optimize for drawing app
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // PWA support for offline drawing
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        ]
      }
    ];
  },

  // Enable static optimization
  trailingSlash: false,
  reactStrictMode: true,

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    MCP_SERVER_URL: process.env.MCP_SERVER_URL || 'ws://localhost:3002'
  }
};

export default nextConfig;