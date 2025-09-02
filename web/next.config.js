/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude Playwright and browser automation from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
      // Exclude server-only modules from client bundle
      config.externals.push('playwright-core', 'playwright', '../../../helpers/browser.js');
    }
    return config;
  },
}

module.exports = nextConfig
