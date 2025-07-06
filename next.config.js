// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */

const nextConfig = {
  staticPageGenerationTimeout: 300,
  staticGenerationMaxConcurrency: 2,
};

module.exports = withNextIntl(nextConfig);
