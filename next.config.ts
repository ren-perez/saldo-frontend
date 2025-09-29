import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'ded6e7106cd055bb832c5438d6d36d31.r2.cloudflarestorage.com',
      'pub-fce27a4089b44a73b8fc267aefeebde6.r2.dev', // dev
      'pub-b264c67b59ea4ec887df2620b88af9b4.r2.dev',// prod
    ],
  },
};

export default nextConfig;
