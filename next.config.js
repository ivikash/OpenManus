/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Set the source directory to src
  experimental: {
    appDir: true,
  },
  distDir: '.next',
}

module.exports = nextConfig
