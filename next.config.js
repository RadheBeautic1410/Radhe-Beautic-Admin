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
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
      },
    ],
  },
}

module.exports = nextConfig
