// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require('next-intl/plugin');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const withNextIntl = createNextIntlPlugin();

// @duckarchive/map ships both a CJS and an ESM build, but its CJS build
// `require()`s @heroui/react, which is ESM-only in v3 — so that entry can never
// resolve. Pin resolution to the ESM build. Removable once the package stops
// emitting a CJS bundle (or stops importing @heroui/react from it).
const mapEsmEntry = path.join(
  path.dirname(require.resolve('@duckarchive/map/package.json')),
  'dist/index.js',
);

/** @type {import('next').NextConfig} */

const nextConfig = {
  // /institutions was renamed to /authors; keep old links (and the localized
  // variants the middleware produces) working.
  async redirects() {
    return [
      { source: '/institutions', destination: '/authors', permanent: true },
      { source: '/:locale(en|pl|cz|ro|es|it)/institutions', destination: '/:locale/authors', permanent: true },
    ];
  },
  staticPageGenerationTimeout: 300,
  serverExternalPackages: ['ag-grid-community'],
  transpilePackages: ['@duckarchive/map', '@duckarchive/framework'],
  experimental: {
    staticGenerationMaxConcurrency: 2,
  },
  turbopack: {
    // Turbopack resolves alias targets relative to the project root, so this one
    // must stay a "./"-prefixed path rather than the absolute path webpack wants.
    resolveAlias: {
      '@duckarchive/map': './node_modules/@duckarchive/map/dist/index.js',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@duckarchive/map$': mapEsmEntry,
    };
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
