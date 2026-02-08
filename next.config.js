// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin(
  // Point to the same file you're configuring here
  './i18n/request.ts'
);

/** @type {import('next').NextConfig} */

const nextConfig = {
  staticPageGenerationTimeout: 300,
  experimental: {
    staticGenerationMaxConcurrency: 2,
  }
};

module.exports = withNextIntl(nextConfig);
