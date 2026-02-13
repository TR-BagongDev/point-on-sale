const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable turbopack for worktree compatibility (symlink node_modules issue)
  turbopack: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
