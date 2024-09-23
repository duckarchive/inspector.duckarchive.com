/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 240,
  experimental: {
    workerThreads: false,
    cpus: 2,
  },
}

module.exports = nextConfig
