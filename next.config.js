/** @type {import('next').NextConfig} */
const dns = require('dns');
// Force IPv4 first to prevent Undici fetch timeouts to Google APIs
dns.setDefaultResultOrder('ipv4first');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
