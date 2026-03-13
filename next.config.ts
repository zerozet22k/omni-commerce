/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/placeholders/**/**/**",
      },
      {
        pathname: "/api/assets/**/**/**",
      },
      {
        pathname: "/uploads/**/**/**",
      },
    ],
  },
};

module.exports = nextConfig;