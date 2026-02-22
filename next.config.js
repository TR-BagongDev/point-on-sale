const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

// Conditionally use PWA if available
let config = nextConfig;
try {
  const withPWA = require('@next/pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  });
  config = withPWA(nextConfig);
} catch (e) {
  // PWA not installed, use base config
  console.warn('PWA not installed, running without PWA support');
  config = nextConfig;
}

module.exports = config
