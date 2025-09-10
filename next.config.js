/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      {
        source: '/catalogue/:code',
        destination: '/catalogue/:code/page/1',
        permanent: true,
      },
      {
        source: '/catalogue/:code/page/:pageNum/:kurti',
        destination: '/catalogue/:code/:kurti',
        permanent: true,
      },
      {
        source: '/orders',
        destination: '/orders/pending',
        permanent: true,
      }
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '**',
      },
    ],
  },
  webpack: (config) => {
    // 🚀 Ignore all .map files (like Browser.js.map from chrome-aws-lambda)
    config.module.rules.push({
      test: /\.map$/,
      type: "asset/source",
    });

    return config;
  },
}

module.exports = nextConfig;
