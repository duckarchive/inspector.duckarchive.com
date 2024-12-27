/** @type {import('next').NextConfig} */

const corsHeaders = [
  { key: "Access-Control-Allow-Credentials", value: "true" },
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET,POST" },
  {
    key: "Access-Control-Allow-Headers",
    value:
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  },
];

const nextConfig = {
  staticPageGenerationTimeout: 300,
  async headers() {
    return [
      {
        source: "/api/availability/:path*",
        headers: corsHeaders,
      },
      {
        source: "/api/sync/:path*",
        headers: corsHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
