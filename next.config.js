// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */

const nextConfig = {
  staticPageGenerationTimeout: 300,
  serverExternalPackages: ['ag-grid-community'],
  experimental: {
    staticGenerationMaxConcurrency: 2,
  }
};

module.exports = withNextIntl(nextConfig);
